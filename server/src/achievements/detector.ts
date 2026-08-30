import type { GameState, TransactionLogEntry, AchievementType } from '@phalanxduel/shared';

export interface DetectorContext {
  matchId: string;
  winnerIndex: 0 | 1 | null;
  loserIndex: 0 | 1 | null;
  finalState: GameState;
  transactionLog: TransactionLogEntry[];
}

export interface DetectorResult {
  type: AchievementType;
  playerIndex: number;
  metadata?: Record<string, unknown>;
}

export type AchievementDetector = (ctx: DetectorContext) => DetectorResult[];
