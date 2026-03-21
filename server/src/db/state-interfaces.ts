import type { Action, GameState } from '@phalanxduel/shared';
import type { GameConfig } from '@phalanxduel/engine';

/**
 * ILedgerStore: The Data Link layer (OSI Layer 2).
 * Responsible for the atomic, durable storage of the Match Ledger.
 */
export interface ILedgerStore {
  /** Create a new match header with initial config. */
  createMatch(matchId: string, config: GameConfig): Promise<void>;

  /** Fetch the immutable configuration for a match. */
  getMatchConfig(matchId: string): Promise<GameConfig | null>;

  /**
   * Append a new action to the ledger.
   * MUST enforce atomic sequencing (sequenceNumber must be current + 1).
   * Returns the new sequence number on success.
   */
  appendAction(
    matchId: string,
    action: Action,
    stateHashAfter: string,
    expectedSeq: number,
  ): Promise<number>;

  /** Fetch all actions for a match since a specific sequence (exclusive). */
  getActions(matchId: string, sinceSeq: number): Promise<Action[]>;

  /** Optional: Save a state snapshot for fast cold-boots. */
  saveSnapshot(matchId: string, state: GameState, seq: number): Promise<void>;

  /** Optional: Get the latest snapshot if available. */
  getLatestSnapshot(matchId: string): Promise<{ state: GameState; seq: number } | null>;
}

/**
 * IEventBus: The Network layer (OSI Layer 3).
 * Responsible for cluster-wide signaling.
 */
export interface IEventBus {
  /** Notify the cluster that a match ledger has been updated. */
  notifyUpdate(matchId: string): Promise<void>;

  /** Subscribe to ledger update notifications. */
  subscribe(handler: (matchId: string) => void): void;
}
