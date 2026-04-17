/**
 * TASK-96: ILedgerStore — append-only action log for distributed match state.
 *
 * Provides a transport-agnostic interface over the match_actions table so that
 * MatchManager (and eventually a distributed supervisor) can persist and replay
 * actions without depending on a specific DB client or in-memory data structure.
 *
 * Implementations:
 *   PostgresLedgerStore — production; writes to match_actions via Drizzle.
 *   InMemoryLedgerStore — local dev / tests; no DB dependency.
 */

import type { Action } from '@phalanxduel/shared';
import type { GameConfig } from '@phalanxduel/engine';
import { db } from './index.js';
import { matchActions, matches } from './schema.js';
import { eq, asc, gte, and } from 'drizzle-orm';
import { traceDbQuery } from './observability.js';
import type { IEventBus } from '../event-bus.js';

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export interface LedgerAction {
  sequenceNumber: number;
  action: Action;
  stateHashBefore: string;
  stateHashAfter: string;
  msgId?: string | null;
  createdAt: string;
}

export interface AppendActionEntry {
  matchId: string;
  sequenceNumber: number;
  action: Action;
  stateHashBefore: string;
  stateHashAfter: string;
  msgId?: string | null;
}

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export interface ILedgerStore {
  /**
   * Return the GameConfig that was used to create the match, or null if the
   * match is not known to this store.
   */
  getMatchConfig(matchId: string): Promise<GameConfig | null>;

  /**
   * Append a single action entry to the ledger. Must be idempotent on
   * duplicate (matchId, sequenceNumber) pairs so that retries are safe.
   */
  appendAction(entry: AppendActionEntry): Promise<void>;

  /**
   * Return all action entries for a match in ascending sequence order.
   */
  getActions(matchId: string): Promise<LedgerAction[]>;

  /**
   * Return action entries for a match starting from minSequenceNumber (inclusive).
   */
  getActionsFrom(matchId: string, minSequenceNumber: number): Promise<LedgerAction[]>;
}

// ---------------------------------------------------------------------------
// Postgres implementation
// ---------------------------------------------------------------------------

export class PostgresLedgerStore implements ILedgerStore {
  constructor(private readonly eventBus?: IEventBus) {}

  async getMatchConfig(matchId: string): Promise<GameConfig | null> {
    const database = db;
    if (!database) return null;

    try {
      const rows = await traceDbQuery(
        'db.ledger.get_match_config',
        { operation: 'SELECT', table: 'matches' },
        () =>
          database
            .select({ config: matches.config })
            .from(matches)
            .where(eq(matches.id, matchId))
            .limit(1),
      );
      const config = rows[0]?.config;
      return config ? (config as GameConfig) : null;
    } catch (err) {
      console.error('LedgerStore: failed to get match config:', err);
      return null;
    }
  }

  async appendAction({
    matchId,
    sequenceNumber,
    action,
    stateHashBefore,
    stateHashAfter,
    msgId,
  }: AppendActionEntry): Promise<void> {
    const database = db;
    if (!database) return;

    try {
      await traceDbQuery(
        'db.ledger.append_action',
        { operation: 'INSERT', table: 'match_actions' },
        () =>
          database
            .insert(matchActions)
            .values({ matchId, sequenceNumber, action, stateHashBefore, stateHashAfter, msgId })
            .onConflictDoNothing(),
      );

      if (this.eventBus) {
        console.log(`[LedgerStore] Publishing update for match ${matchId}, seq ${sequenceNumber}`);
        await this.eventBus.publishMatchUpdate({ matchId, sequenceNumber });
      } else {
        console.warn(
          `[LedgerStore] No eventBus configured, NOT publishing update for match ${matchId}`,
        );
      }
    } catch (err) {
      console.error(
        `LedgerStore: failed to append action (match=${matchId}, seq=${sequenceNumber}):`,
        err,
      );
      throw err;
    }
  }

  async getActions(matchId: string): Promise<LedgerAction[]> {
    return this.getActionsFrom(matchId, 0);
  }

  async getActionsFrom(matchId: string, minSequenceNumber: number): Promise<LedgerAction[]> {
    const database = db;
    if (!database) return [];

    try {
      const rows = await traceDbQuery(
        'db.ledger.get_actions',
        { operation: 'SELECT', table: 'match_actions' },
        () =>
          database
            .select()
            .from(matchActions)
            .where(
              and(
                eq(matchActions.matchId, matchId),
                gte(matchActions.sequenceNumber, minSequenceNumber),
              ),
            )
            .orderBy(asc(matchActions.sequenceNumber)),
      );
      return rows.map((row) => ({
        sequenceNumber: row.sequenceNumber,
        action: row.action as Action,
        stateHashBefore: row.stateHashBefore,
        stateHashAfter: row.stateHashAfter,
        msgId: row.msgId,
        createdAt: row.createdAt.toISOString(),
      }));
    } catch (err) {
      console.error(
        `LedgerStore: failed to get actions (match=${matchId}, from=${minSequenceNumber}):`,
        err,
      );
      return [];
    }
  }
}

// ---------------------------------------------------------------------------
// InMemory implementation (local dev / unit tests)
// ---------------------------------------------------------------------------

interface MemoryEntry {
  config: GameConfig;
  actions: Map<number, LedgerAction>;
}

export class InMemoryLedgerStore implements ILedgerStore {
  private readonly store = new Map<string, MemoryEntry>();
  constructor(private readonly eventBus?: IEventBus) {}

  /**
   * Seed a match config so that getMatchConfig works without a database.
   * Call this when creating a new match in tests or local mode.
   */
  seedMatch(matchId: string, config: GameConfig): void {
    if (!this.store.has(matchId)) {
      this.store.set(matchId, { config, actions: new Map() });
    }
  }

  async getMatchConfig(matchId: string): Promise<GameConfig | null> {
    return this.store.get(matchId)?.config ?? null;
  }

  async appendAction({
    matchId,
    sequenceNumber,
    action,
    stateHashBefore,
    stateHashAfter,
    msgId,
  }: AppendActionEntry): Promise<void> {
    let entry = this.store.get(matchId);
    if (!entry) {
      // Matches created outside seedMatch (e.g. in production-path tests);
      // create a placeholder config so actions can still be stored.
      const placeholder: GameConfig = {
        matchId,
        players: [
          { id: 'unknown-0', name: 'Unknown' },
          { id: 'unknown-1', name: 'Unknown' },
        ],
        rngSeed: 0,
      };
      entry = { config: placeholder, actions: new Map() };
      this.store.set(matchId, entry);
    }

    // Idempotent — ignore duplicate sequence numbers.
    if (!entry.actions.has(sequenceNumber)) {
      entry.actions.set(sequenceNumber, {
        sequenceNumber,
        action,
        stateHashBefore,
        stateHashAfter,
        msgId,
        createdAt: new Date().toISOString(),
      });

      if (this.eventBus) {
        void this.eventBus.publishMatchUpdate({ matchId, sequenceNumber });
      }
    }
  }

  async getActions(matchId: string): Promise<LedgerAction[]> {
    return this.getActionsFrom(matchId, 0);
  }

  async getActionsFrom(matchId: string, minSequenceNumber: number): Promise<LedgerAction[]> {
    const entry = this.store.get(matchId);
    if (!entry) return [];
    return [...entry.actions.values()]
      .filter((a) => a.sequenceNumber >= minSequenceNumber)
      .sort((a, b) => a.sequenceNumber - b.sequenceNumber);
  }

  /** Convenience for tests — wipe all state. */
  clear(): void {
    this.store.clear();
  }
}
