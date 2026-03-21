import { eq } from 'drizzle-orm';
import postgres from 'postgres';
import { db } from './index.js';
import { matches } from './schema.js';
import type { MatchInstance } from '../match.js';
import type { GameState, Action, PhalanxEvent } from '@phalanxduel/shared';
import type { GameConfig } from '@phalanxduel/engine';
import type {
  IStateStore,
  IEventBus,
  MatchEventHandler,
  StateModifier,
} from './state-interfaces.js';

type MatchRow = typeof matches.$inferSelect;

/**
 * PostgresStateStore: Implements distributed state management using Postgres row-level locks.
 */
export class PostgresStateStore implements IStateStore {
  async getMatch(matchId: string): Promise<MatchInstance | null> {
    const database = db;
    if (!database) throw new Error('Database not initialized');

    const result = await database.select().from(matches).where(eq(matches.id, matchId)).limit(1);
    if (result.length === 0) return null;

    const row = result[0]!;
    return this.mapRowToInstance(row);
  }

  async saveMatch(match: MatchInstance): Promise<void> {
    const database = db;
    if (!database) throw new Error('Database not initialized');

    await database
      .update(matches)
      .set({
        state: match.state,
        config: match.config,
        actionHistory: match.actionHistory,
        lifecycleEvents: match.lifecycleEvents,
        player1SessionId: match.players[0]?.playerId,
        player2SessionId: match.players[1]?.playerId,
        updatedAt: new Date(),
      })
      .where(eq(matches.id, match.matchId));
  }

  async lockMatch<T>(matchId: string, modifier: StateModifier<T>): Promise<T> {
    const database = db;
    if (!database) throw new Error('Database not initialized');

    // Utilize SELECT FOR UPDATE to acquire an exclusive lock on the match row
    return await database.transaction(async (tx) => {
      const result = await tx
        .select()
        .from(matches)
        .where(eq(matches.id, matchId))
        .for('update')
        .limit(1);

      if (result.length === 0) {
        throw new Error(`Cannot lock match ${matchId}: Not found in store.`);
      }

      const instance = this.mapRowToInstance(result[0]!);
      const returnValue = await modifier(instance);

      await tx
        .update(matches)
        .set({
          state: instance.state,
          config: instance.config,
          actionHistory: instance.actionHistory,
          lifecycleEvents: instance.lifecycleEvents,
          player1SessionId: instance.players[0]?.playerId,
          player2SessionId: instance.players[1]?.playerId,
          updatedAt: new Date(),
        })
        .where(eq(matches.id, matchId));

      return returnValue;
    });
  }

  async removeMatch(matchId: string): Promise<void> {
    const database = db;
    if (!database) throw new Error('Database not initialized');
    await database.delete(matches).where(eq(matches.id, matchId));
  }

  async getActiveMatches(): Promise<MatchInstance[]> {
    const database = db;
    if (!database) throw new Error('Database not initialized');
    const rows = await database.select().from(matches).where(eq(matches.status, 'active'));
    return rows.map((r) => this.mapRowToInstance(r));
  }

  private mapRowToInstance(row: MatchRow): MatchInstance {
    return {
      matchId: row.id,
      players: [
        row.player1Name
          ? {
              playerId: row.player1SessionId || 'p1',
              playerName: row.player1Name,
              playerIndex: 0,
              userId: row.player1Id || undefined,
            }
          : null,
        row.player2Name
          ? {
              playerId: row.player2SessionId || 'p2',
              playerName: row.player2Name,
              playerIndex: 1,
              userId: row.player2Id || undefined,
            }
          : null,
      ],
      spectators: [],
      state: row.state as GameState,
      config: row.config as unknown as GameConfig,
      actionHistory: row.actionHistory as Action[],
      lifecycleEvents: row.lifecycleEvents as PhalanxEvent[],
      lastPreState: null,
      createdAt: row.createdAt.getTime(),
      lastActivityAt: row.updatedAt.getTime(),
    } as MatchInstance;
  }
}

/**
 * PostgresEventBus: Uses LISTEN/NOTIFY to propagate events across nodes.
 */
export class PostgresEventBus implements IEventBus {
  private readonly sql: postgres.Sql;
  private readonly handlers = new Set<MatchEventHandler>();
  private readonly matchHandlers = new Map<string, Set<MatchEventHandler>>();

  constructor(connectionString: string) {
    // Dedicated connection for LISTEN (cannot be pooled)
    this.sql = postgres(connectionString);
    this.init();
  }

  private async init() {
    await this.sql.listen('match_state_updates', (payload) => {
      try {
        const match = JSON.parse(payload) as MatchInstance;
        
        // Notify global subscribers
        this.handlers.forEach(h => h(match));
        
        // Notify match-specific subscribers
        const matchSet = this.matchHandlers.get(match.matchId);
        if (matchSet) {
          matchSet.forEach(h => h(match));
        }
      } catch (err) {
        console.error('Failed to process Postgres NOTIFY:', err);
      }
    });
  }

  async publishStateUpdate(_matchId: string, match: MatchInstance): Promise<void> {
    // Notify other nodes via Postgres
    await this.sql`NOTIFY match_state_updates, ${JSON.stringify(match)}`;
  }

  subscribeToAllStateUpdates(handler: MatchEventHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  subscribeToStateUpdates(matchId: string, handler: MatchEventHandler): () => void {
    if (!this.matchHandlers.has(matchId)) {
      this.matchHandlers.set(matchId, new Set());
    }
    this.matchHandlers.get(matchId)!.add(handler);
    return () => {
      const set = this.matchHandlers.get(matchId);
      if (set) {
        set.delete(handler);
        if (set.size === 0) this.matchHandlers.delete(matchId);
      }
    };
  }

  unsubscribeAll(matchId: string): void {
    this.matchHandlers.delete(matchId);
  }

  async close() {
    await this.sql.end();
  }
}
