import type { FastifyInstance } from 'fastify';
import { MatchManager } from '../match.js';

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
}
