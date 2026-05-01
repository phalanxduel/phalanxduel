import type { GameState } from '@phalanxduel/shared';
import { db } from '../db/index.js';
import { achievements } from '../db/schema.js';
import { traceDbQuery } from '../db/observability.js';
import { ALL_DETECTORS } from './detectors.js';
import type { DetectorContext } from './detector.js';

export interface ProcessMatchAchievementsOptions {
  matchId: string;
  finalState: GameState;
  /** userId per player index — null for bots/guests */
  playerUserIds: [string | null, string | null];
}

/**
 * Runs all achievement detectors against a completed match and persists any
 * newly earned achievements. Skips players without a userId (bots/guests).
 * Safe to call multiple times — the unique index on (user_id, type) prevents
 * double-awarding.
 */
export async function processMatchAchievements({
  matchId,
  finalState,
  playerUserIds,
}: ProcessMatchAchievementsOptions): Promise<void> {
  if (!db) return;

  const outcome = finalState.outcome;
  if (!outcome) return;

  const transactionLog = finalState.transactionLog ?? [];

  const ctx: DetectorContext = {
    matchId,
    winnerIndex: outcome.winnerIndex,
    loserIndex: outcome.winnerIndex === 0 ? 1 : 0,
    finalState,
    transactionLog,
  };

  for (const detector of ALL_DETECTORS) {
    let detections;
    try {
      detections = detector(ctx);
    } catch (err) {
      console.error('[achievements] detector threw', { detector: detector.name, err });
      continue;
    }

    for (const detection of detections) {
      const userId = playerUserIds[detection.playerIndex];
      if (!userId) continue;

      try {
        await traceDbQuery(
          'db.achievements.insert_ignore',
          { operation: 'INSERT', table: 'achievements' },
          () =>
            db!
              .insert(achievements)
              .values({
                userId,
                type: detection.type,
                matchId,
                metadata: detection.metadata ?? {},
              })
              .onConflictDoNothing(),
        );
      } catch (err) {
        console.error('[achievements] insert failed', { userId, type: detection.type, err });
      }
    }
  }
}
