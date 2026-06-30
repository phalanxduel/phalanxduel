import { db } from './db/index.js';
import { seasons, seasonArchives, eloSnapshots } from './db/schema.js';
import { eq, desc, sql } from 'drizzle-orm';
import { traceDbQuery } from './db/observability.js';
import type { LadderCategory } from './ladder.js';

export class SeasonService {
  async getActiveSeason() {
    const database = db;
    if (!database) return null;

    const rows = await traceDbQuery(
      'db.seasons.select_active',
      { operation: 'SELECT', table: 'seasons' },
      () =>
        database
          .select()
          .from(seasons)
          .where(eq(seasons.isActive, true))
          .orderBy(desc(seasons.number))
          .limit(1),
    );
    return rows[0] || null;
  }

  async startNewSeason(): Promise<{
    previousSeasonNumber: number | null;
    newSeasonNumber: number;
  }> {
    const database = db;
    if (!database) throw new Error('Database not initialized');

    return await database.transaction(async (tx) => {
      const activeRows = await tx
        .select()
        .from(seasons)
        .where(eq(seasons.isActive, true))
        .orderBy(desc(seasons.number))
        .limit(1);
      const activeSeason = activeRows[0] || null;

      if (activeSeason) {
        // Archive current ladder standings
        const categories: LadderCategory[] = ['pvp', 'sp-random', 'sp-heuristic', 'sp-mcts'];
        for (const cat of categories) {
          const snapshotRows = await tx
            .select()
            .from(eloSnapshots)
            .where(
              sql`${eloSnapshots.id} IN (
                SELECT id FROM (
                  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY computed_at DESC) as rn
                  FROM elo_snapshots
                  WHERE category = ${cat}
                ) tmp WHERE rn = 1
              )`,
            )
            .orderBy(desc(eloSnapshots.elo));

          let rank = 1;
          for (const row of snapshotRows) {
            await tx.insert(seasonArchives).values({
              seasonId: activeSeason.id,
              userId: row.userId,
              category: cat,
              elo: row.elo,
              rank,
              matchesPlayed: row.matchesInWindow,
              wins: row.winsInWindow,
            });
            rank++;
          }
        }

        await tx
          .update(seasons)
          .set({ isActive: false, endedAt: new Date() })
          .where(eq(seasons.id, activeSeason.id));
      }

      const nextNumber = activeSeason ? activeSeason.number + 1 : 1;
      await tx.insert(seasons).values({
        number: nextNumber,
        isActive: true,
      });

      // We do NOT delete elo_snapshots. The rolling window will naturally drop old matches
      // when we change computePlayerElo to use Math.max(windowStart, season.startedAt).

      return {
        previousSeasonNumber: activeSeason?.number ?? null,
        newSeasonNumber: nextNumber,
      };
    });
  }
}
