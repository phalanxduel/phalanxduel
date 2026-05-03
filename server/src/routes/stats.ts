import type { FastifyInstance } from 'fastify';
import type { IMatchManager } from '../match-types.js';
import { computeStateHash } from '@phalanxduel/shared/hash';
import type { MatchEventLog } from '@phalanxduel/shared';
import { replayGame } from '@phalanxduel/engine';
import { httpTraceContext, traceHttpHandler } from '../tracing.js';
import { MatchRepository } from '../db/match-repo.js';
import { toJsonSchema } from '../utils/openapi.js';
import { z } from 'zod';
import { ErrorResponseSchema } from '@phalanxduel/shared';

function verifyEventLogFingerprint(
  eventLog: MatchEventLog | null,
): { valid: boolean; eventCount: number; error?: string } | null {
  if (!eventLog) return null;
  try {
    const computed = computeStateHash(eventLog.events);
    return { valid: computed === eventLog.fingerprint, eventCount: eventLog.events.length };
  } catch (err) {
    return {
      valid: false,
      eventCount: eventLog.events.length,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export function registerStatsRoutes(fastify: FastifyInstance, matchManager: IMatchManager) {
  const matchRepo = new MatchRepository();

  fastify.get(
    '/api/stats',
    {
      schema: {
        tags: ['stats'],
        summary: 'Global match statistics',
        description: 'Returns a summary of active and completed matches managed by the server.',
        response: {
          200: toJsonSchema(
            z.object({
              totalMatches: z.number().int(),
              activeMatches: z.number().int(),
              completedMatches: z.number().int(),
            }),
          ),
        },
      },
    },
    async (request, reply) => {
      return traceHttpHandler('stats.summary', httpTraceContext(request, reply), () => {
        const matches = matchManager.listInMemoryMatches();
        const totalMatches = matches.length;
        const activeMatches = matches.filter((m) => m.state && m.state.phase !== 'gameOver').length;
        const completedMatches = totalMatches - activeMatches;

        return {
          totalMatches,
          activeMatches,
          completedMatches,
        };
      });
    },
  );

  fastify.get<{ Params: { matchId: string } }>(
    '/api/matches/:matchId/verify',
    {
      schema: {
        tags: ['matches'],
        summary: 'Verify match integrity',
        description:
          'Replays the match action history and verifies the state hash chain against either in-memory or persisted state.',
        params: toJsonSchema(
          z.object({
            matchId: z.uuid(),
          }),
        ),
        response: {
          200: toJsonSchema(
            z.object({
              valid: z.boolean(),
              source: z.enum(['memory', 'database']),
              actionCount: z.number().int(),
              finalStateHash: z.string(),
              storedFinalHash: z.string().optional(),
              hashChain: z
                .object({
                  valid: z.boolean(),
                  actionCount: z.number().int(),
                  finalStateHash: z.string().nullable(),
                  error: z.string().optional(),
                })
                .optional(),
              eventLog: z
                .object({
                  valid: z.boolean(),
                  eventCount: z.number().int(),
                  error: z.string().optional(),
                })
                .optional(),
              error: z.string().optional(),
              failedAtIndex: z.number().int().optional(),
            }),
          ),
          404: toJsonSchema(ErrorResponseSchema),
        },
      },
    },
    async (request, reply) => {
      return traceHttpHandler('matches.verify', httpTraceContext(request, reply), async () => {
        const { matchId } = request.params;

        // Try in-memory first (active matches)
        const match = matchManager.getMatchSync(matchId);

        if (match?.config) {
          // In-memory replay verification
          const result = replayGame(match.config, match.actionHistory, {
            hashFn: computeStateHash,
          });

          // Also verify hash chain + event log fingerprint from DB if available
          const [chainResult, eventLog] = await Promise.all([
            matchRepo.verifyHashChain(matchId),
            matchRepo.getEventLog(matchId),
          ]);

          const eventLogCheck = verifyEventLogFingerprint(eventLog);

          const response: {
            valid: boolean;
            source: 'memory' | 'database';
            actionCount: number;
            finalStateHash: string;
            hashChain?: {
              valid: boolean;
              actionCount: number;
              finalStateHash: string | null;
              error?: string;
            };
            eventLog?: { valid: boolean; eventCount: number; error?: string };
            error?: string;
            failedAtIndex?: number;
          } = {
            valid:
              result.valid &&
              (chainResult.actionCount === 0 || chainResult.valid) &&
              (eventLogCheck === null || eventLogCheck.valid),
            source: 'memory',
            actionCount: match.actionHistory.length,
            finalStateHash: computeStateHash(result.finalState),
            hashChain: chainResult.actionCount > 0 ? chainResult : undefined,
            eventLog: eventLogCheck ?? undefined,
          };

          if (result.error) {
            response.error = result.error;
            response.failedAtIndex = result.failedAtIndex;
          }

          return response;
        }

        // Fall back to DB — match may have been evicted from memory or server restarted
        const [chainResult, storedFinalHash, eventLog] = await Promise.all([
          matchRepo.verifyHashChain(matchId),
          matchRepo.getFinalStateHash(matchId),
          matchRepo.getEventLog(matchId),
        ]);

        if (chainResult.actionCount === 0) {
          void reply.status(404);
          return { error: 'Match not found', code: 'MATCH_NOT_FOUND' };
        }

        const hashMatch = chainResult.finalStateHash === storedFinalHash;
        const eventLogCheck = verifyEventLogFingerprint(eventLog);

        const response: {
          valid: boolean;
          source: 'memory' | 'database';
          actionCount: number;
          finalStateHash: string;
          storedFinalHash?: string;
          hashChain: {
            valid: boolean;
            actionCount: number;
            finalStateHash: string | null;
            error?: string;
          };
          eventLog?: { valid: boolean; eventCount: number; error?: string };
          error?: string;
        } = {
          valid: chainResult.valid && hashMatch && (eventLogCheck === null || eventLogCheck.valid),
          source: 'database',
          actionCount: chainResult.actionCount,
          finalStateHash: chainResult.finalStateHash ?? '',
          storedFinalHash: storedFinalHash ?? undefined,
          hashChain: chainResult,
          eventLog: eventLogCheck ?? undefined,
        };

        if (chainResult.error) {
          response.error = chainResult.error;
        }

        if (!hashMatch) {
          response.error = `Final hash mismatch: chain=${chainResult.finalStateHash}, stored=${storedFinalHash}`;
        }

        return response;
      });
    },
  );
}
