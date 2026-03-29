import type { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { LadderService, type LadderCategory } from '../ladder.js';
import { traceDbQuery } from '../db/observability.js';
import { httpTraceContext, traceHttpHandler } from '../tracing.js';
import { toJsonSchema } from '../utils/openapi.js';
import { z } from 'zod';

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

  const LadderEntrySchema = z.object({
    rank: z.number().int(),
    userId: z.uuid(),
    gamertag: z.string(),
    elo: z.number().int(),
    matches: z.number().int(),
    wins: z.number().int(),
  });

  fastify.get<{ Params: { category: string } }>(
    '/api/ladder/:category',
    {
      schema: {
        tags: ['ladder'],
        summary: 'Get leaderboard by category',
        description:
          'Returns the top rankings for a specific category (pvp, sp-random, sp-heuristic).',
        params: toJsonSchema(
          z.object({
            category: z.enum(['pvp', 'sp-random', 'sp-heuristic']),
          }),
        ),
        response: {
          200: toJsonSchema(
            z.object({
              category: z.string(),
              windowDays: z.number().int(),
              computedAt: z.iso.datetime(),
              rankings: z.array(LadderEntrySchema),
            }),
          ),
          400: { $ref: 'ErrorResponse#' },
        },
      },
    },
    async (request, reply) => {
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
    },
  );

  fastify.get<{ Params: { category: string; userId: string } }>(
    '/api/ladder/:category/:userId',
    {
      schema: {
        tags: ['ladder'],
        summary: 'Get player ladder stats',
        description: "Returns a specific player's ranking and performance in a category.",
        params: toJsonSchema(
          z.object({
            category: z.enum(['pvp', 'sp-random', 'sp-heuristic']),
            userId: z.uuid(),
          }),
        ),
        response: {
          200: toJsonSchema(
            z.object({
              userId: z.uuid(),
              gamertag: z.string(),
              category: z.string(),
              elo: z.number().int(),
              matches: z.number().int(),
              wins: z.number().int(),
            }),
          ),
          400: { $ref: 'ErrorResponse#' },
          404: { $ref: 'ErrorResponse#' },
        },
      },
    },
    async (request, reply) => {
      return traceHttpHandler('ladder.player', httpTraceContext(request, reply), async () => {
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
      });
    },
  );

  fastify.get<{ Params: { userId: string } }>(
    '/api/stats/:userId/history',
    {
      schema: {
        tags: ['stats'],
        summary: "Get player's full history",
        description: 'Returns aggregated stats across all categories for a specific user.',
        params: toJsonSchema(
          z.object({
            userId: z.uuid(),
          }),
        ),
        response: {
          200: toJsonSchema(
            z.object({
              userId: z.uuid(),
              gamertag: z.string(),
              categories: z.record(
                z.string(),
                z.object({
                  currentElo: z.number().int(),
                  matches: z.number().int(),
                  wins: z.number().int(),
                }),
              ),
            }),
          ),
          404: { $ref: 'ErrorResponse#' },
        },
      },
    },
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
          const { elo, matchCount, winCount } = await ladder.computePlayerElo(userId, cat);
          categoryStats[cat] = { currentElo: elo, matches: matchCount, wins: winCount };
        }

        return { userId, gamertag, categories: categoryStats };
      });
    },
  );
}
