import { db } from './db/index.js';
import { matches, eloSnapshots } from './db/schema.js';
import { computeRollingElo, ELO_CONSTANTS, type MatchResult } from './elo.js';
import { and, eq, gte, desc, sql } from 'drizzle-orm';
import { traceDbQuery } from './db/observability.js';

export type LadderCategory = 'pvp' | 'sp-random' | 'sp-heuristic';

const PHANTOM_RATINGS: Record<string, number> = {
  'sp-random': 600,
  'sp-heuristic': 1000,
};

const WINDOW_DAYS = 7;
const STALE_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour

export class LadderService {
  static deriveCategory(botStrategy: string | null | undefined): LadderCategory {
    if (!botStrategy) return 'pvp';
    return `sp-${botStrategy}` as LadderCategory;
  }

  static phantomRating(category: LadderCategory): number | null {
    return PHANTOM_RATINGS[category] ?? null;
  }

  /** Compute rolling Elo for a player in a category from the matches table. */
  async computePlayerElo(
    userId: string,
    category: LadderCategory,
  ): Promise<{ elo: number; matchCount: number; winCount: number }> {
    const database = db;
    if (!database) return { elo: ELO_CONSTANTS.BASELINE, matchCount: 0, winCount: 0 };

    const windowStart = new Date();
    windowStart.setUTCDate(windowStart.getUTCDate() - WINDOW_DAYS);

    const categoryFilter =
      category === 'pvp'
        ? sql`${matches.botStrategy} IS NULL`
        : eq(matches.botStrategy, category.replace('sp-', '') as 'random' | 'heuristic');

    const rows = await traceDbQuery(
      'db.matches.select_player_window',
      {
        operation: 'SELECT',
        table: 'matches',
      },
      () =>
        database
          .select({
            player1Id: matches.player1Id,
            player2Id: matches.player2Id,
            outcome: matches.outcome,
            botStrategy: matches.botStrategy,
            updatedAt: matches.updatedAt,
          })
          .from(matches)
          .where(
            and(
              eq(matches.status, 'completed'),
              gte(matches.updatedAt, windowStart),
              categoryFilter,
              sql`(${matches.player1Id} = ${userId} OR ${matches.player2Id} = ${userId})`,
            ),
          )
          .orderBy(matches.updatedAt),
    );

    const matchResults: MatchResult[] = [];
    let winCount = 0;

    for (const row of rows) {
      const outcome = row.outcome as { winnerIndex: number } | null;
      if (!outcome) continue;

      const isPlayer1 = row.player1Id === userId;
      const playerIndex = isPlayer1 ? 0 : 1;
      const win = outcome.winnerIndex === playerIndex;
      if (win) winCount++;

      const phantom = LadderService.phantomRating(category);
      const opponentElo = phantom ?? ELO_CONSTANTS.BASELINE;

      matchResults.push({ opponentElo, win });
    }

    return {
      elo: computeRollingElo(matchResults),
      matchCount: matchResults.length,
      winCount,
    };
  }

  /** Write an Elo snapshot to the history table. */
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
      {
        operation: 'INSERT',
        table: 'elo_snapshots',
      },
      () =>
        database.insert(eloSnapshots).values({
          userId: params.userId,
          category: params.category,
          elo: params.elo,
          kFactor: ELO_CONSTANTS.K_FACTOR,
          windowDays: WINDOW_DAYS,
          matchesInWindow: params.matchCount,
          winsInWindow: params.winCount,
        }),
    );
  }

  /** Called when a match completes. Computes and stores snapshots for authenticated players. */
  async onMatchComplete(match: {
    player1Id: string | null;
    player2Id: string | null;
    botStrategy: string | null | undefined;
  }): Promise<void> {
    const category = LadderService.deriveCategory(match.botStrategy);
    const userIds = [match.player1Id, match.player2Id].filter((id): id is string => id !== null);

    for (const userId of userIds) {
      try {
        const { elo, matchCount, winCount } = await this.computePlayerElo(userId, category);
        await this.writeSnapshot({ userId, category, elo, matchCount, winCount });
      } catch (err) {
        console.warn(`LadderService: failed to update snapshot for user ${userId}:`, err);
      }
    }
  }

  /** Get leaderboard for a category, refreshing stale snapshots. */
  async getLeaderboard(
    category: LadderCategory,
    limit = 50,
  ): Promise<{ userId: string; elo: number; matches: number; wins: number; computedAt: Date }[]> {
    const database = db;
    if (!database) return [];

    const rows = await traceDbQuery(
      'db.elo_snapshots.select_latest_by_category',
      {
        operation: 'SELECT',
        table: 'elo_snapshots',
      },
      () =>
        database
          .select()
          .from(eloSnapshots)
          .where(eq(eloSnapshots.category, category))
          .orderBy(desc(eloSnapshots.computedAt)),
    );

    // Deduplicate to latest per user
    const latest = new Map<string, (typeof rows)[number]>();
    for (const row of rows) {
      if (!latest.has(row.userId)) {
        latest.set(row.userId, row);
      }
    }

    // Check staleness and refresh if needed
    const now = Date.now();
    for (const [userId, snapshot] of latest) {
      if (now - snapshot.computedAt.getTime() > STALE_THRESHOLD_MS) {
        const { elo, matchCount, winCount } = await this.computePlayerElo(userId, category);
        await this.writeSnapshot({ userId, category, elo, matchCount, winCount });
        latest.set(userId, {
          ...snapshot,
          elo,
          matchesInWindow: matchCount,
          winsInWindow: winCount,
          computedAt: new Date(),
        });
      }
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
