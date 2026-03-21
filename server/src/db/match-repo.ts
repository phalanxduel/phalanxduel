import { db } from './index.js';
import { matches } from './schema.js';
import { desc, eq } from 'drizzle-orm';
import type { MatchSummary } from '@phalanxduel/shared';
import { traceDbQuery } from './observability.js';

interface Outcome {
  winnerIndex: number | null;
  victoryType: string | null;
  turnNumber: number | null;
}

/**
 * MatchRepository: Query service for completed matches and summaries.
 * (Layer 1/2: Physical/Data Link).
 */
export class MatchRepository {
  async getCompletedMatches(page: number, limit: number): Promise<MatchSummary[]> {
    const database = db;
    if (!database) return [];

    try {
      const offset = (page - 1) * limit;
      const rows = await traceDbQuery(
        'db.matches.select_completed',
        { operation: 'SELECT', table: 'matches' },
        () =>
          database
            .select({
              id: matches.id,
              outcome: matches.outcome,
              createdAt: matches.createdAt,
              updatedAt: matches.updatedAt,
            })
            .from(matches)
            .where(eq(matches.status, 'completed'))
            .orderBy(desc(matches.createdAt))
            .limit(limit)
            .offset(offset),
      );

      return rows.map((row) => {
        const outcome = row.outcome as Outcome | null;
        return {
          matchId: row.id,
          winnerIndex: outcome?.winnerIndex ?? null,
          victoryType: outcome?.victoryType ?? null,
          turnCount: outcome?.turnNumber ?? null,
          createdAt: row.createdAt.toISOString(),
          completedAt: row.updatedAt.toISOString(),
        };
      });
    } catch (err) {
      console.error('Failed to get completed matches:', err);
      return [];
    }
  }

  async markMatchCompleted(matchId: string, outcome: Outcome): Promise<void> {
    const database = db;
    if (!database) return;

    await database
      .update(matches)
      .set({
        status: 'completed',
        outcome,
        updatedAt: new Date(),
      })
      .where(eq(matches.id, matchId));
  }
}
