import type { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { LadderService, type LadderCategory } from '../ladder.js';
import { traceDbQuery } from '../db/observability.js';
import { httpTraceContext, traceHttpHandler } from '../tracing.js';

const VALID_CATEGORIES = new Set<string>(['pvp', 'sp-random', 'sp-heuristic']);

export function isValidCategory(value: string): value is LadderCategory {
  return VALID_CATEGORIES.has(value);
}

async function resolveGamertag(userId: string): Promise<string> {
  const database = db;
  if (!database) return 'Unknown';
  const rows = await traceDbQuery(
    'db.users.select_gamertag',
    {
      operation: 'SELECT',
      table: 'users',
    },
    () =>
      database
        .select({ gamertag: users.gamertag, suffix: users.suffix })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1),
  );
  const u = rows[0];
  if (!u) return 'Unknown';
  return u.suffix ? `${u.gamertag}#${u.suffix}` : u.gamertag;
}

export function registerLadderRoutes(fastify: FastifyInstance) {
  const ladder = new LadderService();

  fastify.get<{ Params: { category: string } }>('/api/ladder/:category', async (request, reply) => {
    return traceHttpHandler('ladder.category', httpTraceContext(request, reply), async () => {
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
  });

  fastify.get<{ Params: { category: string; userId: string } }>(
    '/api/ladder/:category/:userId',
    async (request, reply) => {
      return traceHttpHandler('ladder.player', httpTraceContext(request, reply), async () => {
        const { category, userId } = request.params;
        if (!isValidCategory(category)) {
          void reply.status(400);
          return { error: 'Invalid category' };
        }

        const gamertag = await resolveGamertag(userId);
        if (gamertag === 'Unknown') {
          void reply.status(404);
          return { error: 'User not found' };
        }

        const rankings = await ladder.getLeaderboard(category);
        const playerEntry = rankings.find((r) => r.userId === userId);

        return {
          userId,
          gamertag,
          category,
          elo: playerEntry?.elo ?? 1000,
          matches: playerEntry?.matches ?? 0,
          wins: playerEntry?.wins ?? 0,
        };
      });
    },
  );

  fastify.get<{ Params: { userId: string } }>(
    '/api/stats/:userId/history',
    async (request, reply) => {
      return traceHttpHandler('stats.history', httpTraceContext(request, reply), async () => {
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
          const rankings = await ladder.getLeaderboard(cat);
          const playerEntry = rankings.find((r) => r.userId === userId);
          categoryStats[cat] = {
            currentElo: playerEntry?.elo ?? 1000,
            matches: playerEntry?.matches ?? 0,
            wins: playerEntry?.wins ?? 0,
          };
        }

        return { userId, gamertag, categories: categoryStats };
      });
    },
  );
}
