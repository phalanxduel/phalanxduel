import type { FastifyInstance } from 'fastify';
import { MatchManager } from '../match.js';
import { computeStateHash } from '@phalanxduel/shared/hash';
import { replayGame } from '@phalanxduel/engine';
import { httpTraceContext, traceHttpHandler } from '../tracing.js';
import { MatchRepository } from '../db/match-repo.js';
import { toJsonSchema } from '../utils/openapi.js';
import { z } from 'zod';

export function registerStatsRoutes(fastify: FastifyInstance, matchManager: MatchManager) {
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
        const matches = Array.from(matchManager.matches.values());
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
            matchId: z.string().uuid(),
          }),
        ),
        response: {
          200: toJsonSchema(
            z.object({
              valid: z.boolean(),
              source: z.enum(['memory', 'database']),
              actionCount: z.number().int(),
              finalStateHash: z.string(),
              storedFinalHash: z.string(),
              hashChain: z.object({
                valid: z.boolean(),
                actionCount: z.number().int(),
                finalStateHash: z.string(),
                error: z.string().nullable(),
              }),
              error: z.string().optional(),
              failedAtIndex: z.number().int().optional(),
            }),
          ),
          404: { $ref: 'ErrorResponse#' },
        },
      },
    },
    async (request, reply) => {
      return traceHttpHandler('matches.verify', httpTraceContext(request, reply), async () => {
        const { matchId } = request.params;

        // Try in-memory first (active matches)
        const match = matchManager.matches.get(matchId);

        if (match?.config) {
          // In-memory replay verification
          const result = replayGame(match.config, match.actionHistory, {
            hashFn: computeStateHash,
          });

          // Also verify hash chain from DB if available
          const chainResult = await matchRepo.verifyHashChain(matchId);

          return {
            valid: result.valid && (chainResult.actionCount === 0 || chainResult.valid),
            source: 'memory',
            actionCount: match.actionHistory.length,
            finalStateHash: computeStateHash(result.finalState),
            hashChain: chainResult.actionCount > 0 ? chainResult : undefined,
            ...(result.error ? { error: result.error, failedAtIndex: result.failedAtIndex } : {}),
          };
        }

        // Fall back to DB — match may have been evicted from memory or server restarted
        const chainResult = await matchRepo.verifyHashChain(matchId);

        if (chainResult.actionCount === 0) {
          void reply.status(404);
          return { error: 'Match not found', code: 'MATCH_NOT_FOUND' };
        }

        // Also check the persisted final hash matches the chain
        const storedFinalHash = await matchRepo.getFinalStateHash(matchId);
        const hashMatch = !storedFinalHash || storedFinalHash === chainResult.finalStateHash;

        return {
          valid: chainResult.valid && hashMatch,
          source: 'database',
          actionCount: chainResult.actionCount,
          finalStateHash: chainResult.finalStateHash,
          storedFinalHash: storedFinalHash ?? undefined,
          hashChain: chainResult,
          ...(chainResult.error ? { error: chainResult.error } : {}),
          ...(!hashMatch
            ? {
                error: `Final hash mismatch: chain=${chainResult.finalStateHash}, stored=${storedFinalHash}`,
              }
            : {}),
        };
      });
    },
  );
}
