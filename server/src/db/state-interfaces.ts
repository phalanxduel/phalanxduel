import type { MatchInstance } from '../match.js';

export type StateModifier<T> = (match: MatchInstance) => Promise<T>;

export interface IStateStore {
  /**
   * Fetch a match from the store without locking it.
   */
  getMatch(matchId: string): Promise<MatchInstance | null>;

  /**
   * Save a newly created match or forcefully overwrite an existing one.
   */
  saveMatch(match: MatchInstance): Promise<void>;

  /**
   * Acquire an exclusive lock on the match, execute the modifier function, and
   * automatically persist the updated state. Critical for preventing race conditions
   * when two players act simultaneously.
   */
  lockMatch<T>(matchId: string, modifier: StateModifier<T>): Promise<T>;

  /**
   * Remove a match from the active store (e.g., after standard TTL).
   */
  removeMatch(matchId: string): Promise<void>;

  /**
   * Provide an iterator or array of all active matches (primarily for cleanup jobs).
   */
  getActiveMatches(): Promise<MatchInstance[]>;
}

export type MatchEventHandler = (match: MatchInstance) => void;

export interface IEventBus {
  /**
   * Publish a state update for a match to all active nodes in the cluster.
   */
  publishStateUpdate(matchId: string, match: MatchInstance): Promise<void>;

  /**
   * Subscribe to state updates for ALL matches globally. Used by the
   * MatchManager on each Node process to route updates to its local connected sockets.
   * Returns an unsubscribe function.
   */
  subscribeToAllStateUpdates(handler: MatchEventHandler): () => void;

  /**
   * Subscribe to state updates for a specific match.
   */
  subscribeToStateUpdates(matchId: string, handler: MatchEventHandler): () => void;

  /**
   * Clean up all handlers for a given match.
   */
  unsubscribeAll(matchId: string): void;
}
