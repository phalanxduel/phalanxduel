import type { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { LadderService, type LadderCategory } from '../ladder.js';

const VALID_CATEGORIES = new Set<string>(['pvp', 'sp-random', 'sp-heuristic']);

export function isValidCategory(value: string): value is LadderCategory {
  return VALID_CATEGORIES.has(value);
}

async function resolveGamertag(userId: string): Promise<string> {
  if (!db) return 'Unknown';
  const rows = await db
    .select({ gamertag: users.gamertag, suffix: users.suffix })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const u = rows[0];
  if (!u) return 'Unknown';
  return u.suffix ? `${u.gamertag}#${u.suffix}` : u.gamertag;
}

export function registerLadderRoutes(fastify: FastifyInstance) {
  const ladder = new LadderService();

  fastify.get<{ Params: { category: string } }>('/api/ladder/:category', async (request, reply) => {
    const { category } = request.params;
    if (!isValidCategory(category)) {
      void reply.status(400);
      return { error: 'Invalid category. Use: pvp, sp-random, sp-heuristic' };
    }

    const rankings = await ladder.getLeaderboard(category);

    const enriched = await Promise.all(
      rankings.map(async (entry, idx) => ({
        rank: idx + 1,
        userId: entry.userId,
        gamertag: await resolveGamertag(entry.userId),
        elo: entry.elo,
        matches: entry.matches,
        wins: entry.wins,
      })),
    );

    return {
      category,
      windowDays: 7,
      computedAt: new Date().toISOString(),
      rankings: enriched,
    };
  });

  fastify.get<{ Params: { category: string; userId: string } }>(
    '/api/ladder/:category/:userId',
    async (request, reply) => {
      const { category, userId } = request.params;
      if (!isValidCategory(category)) {
        void reply.status(400);
        return { error: 'Invalid category' };
      }

      const { elo, matchCount, winCount } = await ladder.computePlayerElo(userId, category);
      const gamertag = await resolveGamertag(userId);

      if (gamertag === 'Unknown') {
        void reply.status(404);
        return { error: 'User not found' };
      }

      return { userId, gamertag, category, elo, matches: matchCount, wins: winCount };
    },
  );

  fastify.get<{ Params: { userId: string } }>(
    '/api/stats/:userId/history',
    async (request, reply) => {
      const { userId } = request.params;

      const gamertag = await resolveGamertag(userId);
      if (gamertag === 'Unknown') {
        void reply.status(404);
        return { error: 'User not found' };
      }

      const categories: LadderCategory[] = ['pvp', 'sp-random', 'sp-heuristic'];
      const categoryStats: Record<string, { currentElo: number; matches: number; wins: number }> =
        {};

      for (const cat of categories) {
        const { elo, matchCount, winCount } = await ladder.computePlayerElo(userId, cat);
        categoryStats[cat] = { currentElo: elo, matches: matchCount, wins: winCount };
      }

      return { userId, gamertag, categories: categoryStats };
    },
  );
}
