import type { FastifyInstance } from 'fastify';
import { MatchManager } from '../match.js';
import { computeStateHash } from '@phalanxduel/shared/hash';
import { replayGame } from '@phalanxduel/engine';
import { httpTraceContext, traceHttpHandler } from '../tracing.js';

export function registerStatsRoutes(fastify: FastifyInstance, matchManager: MatchManager) {
  fastify.get('/api/stats', async (request, reply) => {
    return traceHttpHandler('stats.summary', httpTraceContext(request, reply), async () => {
      const matches = await matchManager.stateStore.getActiveMatches();
      const totalMatches = matches.length;
      const activeMatches = matches.filter((m) => m.state && m.state.phase !== 'gameOver').length;
      const completedMatches = totalMatches - activeMatches;

      return {
        totalMatches,
        activeMatches,
        completedMatches,
      };
    });
  });

  fastify.get<{ Params: { matchId: string } }>(
    '/api/matches/:matchId/verify',
    async (request, reply) => {
      return traceHttpHandler('matches.verify', httpTraceContext(request, reply), async () => {
        const { matchId } = request.params;
        const match = await matchManager.getMatch(matchId);

        if (!match?.config) {
          void reply.status(404);
          return { error: 'Match not found', code: 'MATCH_NOT_FOUND' };
        }

        const result = replayGame(match.config, match.actionHistory, {
          hashFn: computeStateHash,
        });

        return {
          valid: result.valid,
          actionCount: match.actionHistory.length,
          finalStateHash: computeStateHash(result.finalState),
          ...(result.error ? { error: result.error, failedAtIndex: result.failedAtIndex } : {}),
        };
      });
    },
  );
}
