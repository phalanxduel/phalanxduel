import { db } from './db/index.js';
import { eloSnapshots } from './db/schema.js';
import { ELO_CONSTANTS } from './elo.js';
import { eq, desc } from 'drizzle-orm';
import { traceDbQuery } from './db/observability.js';
import type { FastifyInstance } from 'fastify';

export type LadderCategory = 'pvp' | 'sp-random' | 'sp-heuristic';

/**
 * LadderService: Domain logic for player rankings (Layer 7).
 */
export class LadderService {
  static deriveCategory(botStrategy: string | null | undefined): LadderCategory {
    if (!botStrategy) return 'pvp';
    return `sp-${botStrategy}` as LadderCategory;
  }

  async writeSnapshot(params: {
    userId: string;
    category: LadderCategory;
    elo: number;
    matchCount: number;
    winCount: number;
  }): Promise<void> {
    const database = db;
    if (!database) return;

    await traceDbQuery(
      'db.elo_snapshots.insert',
      { operation: 'INSERT', table: 'elo_snapshots' },
      () =>
        database.insert(eloSnapshots).values({
          userId: params.userId,
          category: params.category,
          elo: params.elo,
          kFactor: ELO_CONSTANTS.K_FACTOR,
          windowDays: 7,
          matchesInWindow: params.matchCount,
          winsInWindow: params.winCount,
        }),
    );
  }

  async getLeaderboard(
    category: LadderCategory,
    limit = 50,
  ): Promise<{ userId: string; elo: number; matches: number; wins: number; computedAt: Date }[]> {
    const database = db;
    if (!database) return [];

    const rows = await traceDbQuery(
      'db.elo_snapshots.select_latest_by_category',
      { operation: 'SELECT', table: 'elo_snapshots' },
      () =>
        database
          .select()
          .from(eloSnapshots)
          .where(eq(eloSnapshots.category, category))
          .orderBy(desc(eloSnapshots.computedAt)),
    );

    const latest = new Map<string, (typeof rows)[number]>();
    for (const row of rows) {
      if (!latest.has(row.userId)) latest.set(row.userId, row);
    }

    return Array.from(latest.values())
      .sort((a, b) => b.elo - a.elo)
      .slice(0, limit)
      .map((row) => ({
        userId: row.userId,
        elo: row.elo,
        matches: row.matchesInWindow,
        wins: row.winsInWindow,
        computedAt: row.computedAt,
      }));
  }
}

export function registerLadderRoutes(fastify: FastifyInstance) {
  const service = new LadderService();
  fastify.get<{ Querystring: { category?: LadderCategory } }>('/api/ladder', async (request) => {
    const category = request.query.category || 'pvp';
    return await service.getLeaderboard(category);
  });
}
