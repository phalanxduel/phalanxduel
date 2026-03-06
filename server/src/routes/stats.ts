import type { FastifyInstance } from 'fastify';
import { MatchManager } from '../match.js';
import { computeStateHash } from '@phalanxduel/shared/hash';
import { replayGame } from '@phalanxduel/engine';

export function registerStatsRoutes(fastify: FastifyInstance, matchManager: MatchManager) {
  fastify.get('/api/stats', async () => {
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

  fastify.get<{ Params: { matchId: string } }>(
    '/api/matches/:matchId/verify',
    async (request, reply) => {
      const { matchId } = request.params;
      const match = matchManager.matches.get(matchId);

      if (!match || !match.config) {
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
    },
  );
}
