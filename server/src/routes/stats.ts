import type { FastifyInstance } from 'fastify';
import { MatchManager, MatchActor } from '../match.js';
import { computeStateHash } from '@phalanxduel/shared/hash';
import { replayGame } from '@phalanxduel/engine';
import { httpTraceContext, traceHttpHandler } from '../tracing.js';
import type { Action } from '@phalanxduel/shared';

/**
 * registerStatsRoutes: Layer 7 stats and integrity routes.
 */
export function registerStatsRoutes(fastify: FastifyInstance, matchManager: MatchManager) {
  fastify.get('/api/stats', async (request, reply) => {
    return traceHttpHandler('stats.summary', httpTraceContext(request, reply), async () => {
      const stats = await matchManager.getGlobalStats();
      return stats;
    });
  });

  fastify.get<{ Params: { matchId: string } }>(
    '/api/matches/:matchId/verify',
    async (request, reply) => {
      return traceHttpHandler('matches.verify', httpTraceContext(request, reply), async () => {
        const { matchId } = request.params;
        const matchData = await matchManager.getMatch(matchId);

        if (!matchData?.config || !matchData.state) {
          void reply.status(404);
          return { error: 'Match not found', code: 'MATCH_NOT_FOUND' };
        }

        const actor: MatchActor = await matchManager.getOrCreateActor(matchId);
        const actions: Action[] = await actor.getFullHistory();

        const result = replayGame(matchData.config, actions, {
          hashFn: computeStateHash,
        });

        return {
          valid: result.valid,
          actionCount: actions.length,
          finalStateHash: computeStateHash(result.finalState),
          ...(result.error ? { error: result.error, failedAtIndex: result.failedAtIndex } : {}),
        };
      });
    },
  );
}
