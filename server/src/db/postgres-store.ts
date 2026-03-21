import { eq, gt, and, asc } from 'drizzle-orm';
import postgres from 'postgres';
import { db } from './index.js';
import { matches, matchActions } from './schema.js';
import type { GameState, Action } from '@phalanxduel/shared';
import type { GameConfig } from '@phalanxduel/engine';
import type { ILedgerStore, IEventBus } from './state-interfaces.js';

/**
 * PostgresLedgerStore: Implementation of the Data Link layer (OSI Layer 2).
 */
export class PostgresLedgerStore implements ILedgerStore {
  async createMatch(matchId: string, config: GameConfig): Promise<void> {
    const database = db;
    if (!database) throw new Error('Database not initialized');

    await database.insert(matches).values({
      id: matchId,
      config: config,
      status: 'active',
    });
  }

  async getMatchConfig(matchId: string): Promise<GameConfig | null> {
    const database = db;
    if (!database) throw new Error('Database not initialized');

    const result = await database
      .select({ config: matches.config })
      .from(matches)
      .where(eq(matches.id, matchId))
      .limit(1);

    const row = result[0];
    return row ? (row.config as GameConfig) : null;
  }

  async appendAction(
    matchId: string,
    action: Action,
    stateHashAfter: string,
    expectedSeq: number,
  ): Promise<number> {
    const database = db;
    if (!database) throw new Error('Database not initialized');

    await database.insert(matchActions).values({
      matchId,
      sequenceNumber: expectedSeq,
      action,
      stateHashAfter,
    });

    return expectedSeq;
  }

  async getActions(matchId: string, sinceSeq: number): Promise<Action[]> {
    const database = db;
    if (!database) throw new Error('Database not initialized');

    const rows = await database
      .select({ action: matchActions.action })
      .from(matchActions)
      .where(and(eq(matchActions.matchId, matchId), gt(matchActions.sequenceNumber, sinceSeq)))
      .orderBy(asc(matchActions.sequenceNumber));

    return rows.map((r) => r.action as Action);
  }

  async saveSnapshot(matchId: string, state: GameState, seq: number): Promise<void> {
    const database = db;
    if (!database) throw new Error('Database not initialized');

    await database
      .update(matches)
      .set({
        lastSnapshot: state,
        lastSnapshotSeq: seq,
        updatedAt: new Date(),
      })
      .where(eq(matches.id, matchId));
  }

  async getLatestSnapshot(matchId: string): Promise<{ state: GameState; seq: number } | null> {
    const database = db;
    if (!database) throw new Error('Database not initialized');

    const result = await database
      .select({ state: matches.lastSnapshot, seq: matches.lastSnapshotSeq })
      .from(matches)
      .where(eq(matches.id, matchId))
      .limit(1);

    const row = result[0];
    if (!row?.state || row.seq === null) return null;

    return {
      state: row.state as GameState,
      seq: row.seq,
    };
  }
}

/**
 * PostgresEventBus: Implementation of the Network layer (OSI Layer 3).
 */
export class PostgresEventBus implements IEventBus {
  private readonly sql: postgres.Sql;
  private handler: ((matchId: string) => void) | null = null;

  constructor(connectionString: string) {
    this.sql = postgres(connectionString);
    this.init().catch((err) => {
      console.error('PostgresEventBus failed to init:', err);
    });
  }

  private async init() {
    await this.sql.listen('match_updated', (matchId) => {
      if (this.handler) {
        this.handler(matchId);
      }
    });
  }

  async notifyUpdate(matchId: string): Promise<void> {
    await this.sql`NOTIFY match_updated, ${matchId}`;
  }

  subscribe(handler: (matchId: string) => void): void {
    this.handler = handler;
  }

  async close() {
    await this.sql.end();
  }
}
