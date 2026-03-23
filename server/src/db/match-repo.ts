import { db } from './index.js';
import { matches, transactionLogs } from './schema.js';
import { desc, eq, asc } from 'drizzle-orm';
import type { MatchInstance } from '../match.js';
import type {
  GameState,
  Action,
  MatchEventLog,
  TransactionLogEntry,
  PhalanxEvent,
} from '@phalanxduel/shared';
import type { GameConfig } from '@phalanxduel/engine';
import { traceDbQuery } from './observability.js';

export interface MatchSummary {
  matchId: string;
  playerIds: (string | null)[];
  playerNames: string[];
  winnerIndex: number | null;
  victoryType: string | null;
  turnCount: number | null;
  fingerprint: string | null;
  createdAt: string;
  completedAt: string;
}

export class MatchRepository {
  async saveMatch(match: MatchInstance): Promise<void> {
    const database = db;
    if (!database) return;
    if (!match.config) return;

    const payload = {
      id: match.matchId,
      player1Id: match.players[0]?.userId ?? null,
      player2Id: match.players[1]?.userId ?? null,
      player1Name: match.players[0]?.playerName ?? 'Unknown',
      player2Name: match.players[1]?.playerName ?? 'Unknown',
      botStrategy: match.botStrategy ?? null,
      config: match.config,
      state: match.state,
      actionHistory: match.actionHistory,
      transactionLog: match.state?.transactionLog ?? [],
      outcome: match.state?.outcome ?? null,
      status: (match.state?.phase === 'gameOver' ? 'completed' : 'active') as
        | 'pending'
        | 'active'
        | 'completed'
        | 'cancelled',
      updatedAt: new Date(),
    };

    try {
      await traceDbQuery(
        'db.matches.upsert',
        {
          operation: 'UPSERT',
          table: 'matches',
        },
        () =>
          database
            .insert(matches)
            .values({
              ...payload,
              createdAt: new Date(match.createdAt),
            })
            .onConflictDoUpdate({
              target: matches.id,
              set: payload,
            }),
      );
    } catch (err) {
      console.error('Failed to save match to database:', err);
    }
  }

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
              player1Id: matches.player1Id,
              player2Id: matches.player2Id,
              player1Name: matches.player1Name,
              player2Name: matches.player2Name,
              outcome: matches.outcome,
              eventLogFingerprint: matches.eventLogFingerprint,
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
        const outcome = row.outcome as {
          winnerIndex?: number | null;
          victoryType?: string | null;
          turnNumber?: number | null;
        } | null;
        return {
          matchId: row.id,
          playerIds: [row.player1Id ?? null, row.player2Id ?? null],
          playerNames: [row.player1Name, row.player2Name],
          winnerIndex: outcome?.winnerIndex ?? null,
          victoryType: outcome?.victoryType ?? null,
          turnCount: outcome?.turnNumber ?? null,
          fingerprint: row.eventLogFingerprint ?? null,
          createdAt: row.createdAt.toISOString(),
          completedAt: row.updatedAt.toISOString(),
        };
      });
    } catch (err) {
      console.error('Failed to get completed matches from database:', err);
      return [];
    }
  }

  async saveEventLog(matchId: string, log: MatchEventLog): Promise<void> {
    const database = db;
    if (!database) return;

    try {
      await traceDbQuery(
        'db.matches.update_event_log',
        { operation: 'UPDATE', table: 'matches' },
        () =>
          database
            .update(matches)
            .set({ eventLog: log, eventLogFingerprint: log.fingerprint })
            .where(eq(matches.id, matchId)),
      );
    } catch (err) {
      console.error('Failed to save event log to database:', err);
    }
  }

  async getEventLog(matchId: string): Promise<MatchEventLog | null> {
    const database = db;
    if (!database) return null;

    try {
      const result = await traceDbQuery(
        'db.matches.select_event_log',
        { operation: 'SELECT', table: 'matches' },
        () =>
          database
            .select({ eventLog: matches.eventLog })
            .from(matches)
            .where(eq(matches.id, matchId))
            .limit(1),
      );
      const row = result[0];
      if (!row?.eventLog) return null;
      return row.eventLog as MatchEventLog;
    } catch (err) {
      console.error('Failed to get event log from database:', err);
      return null;
    }
  }

  async getMatch(matchId: string): Promise<MatchInstance | null> {
    const database = db;
    if (!database) return null;

    try {
      const result = await traceDbQuery(
        'db.matches.select_by_id',
        {
          operation: 'SELECT',
          table: 'matches',
        },
        () => database.select().from(matches).where(eq(matches.id, matchId)).limit(1),
      );
      if (result.length === 0) return null;

      const row = result[0];
      if (!row) return null;
      // Reconstituting MatchInstance from DB row
      // Note: sockets cannot be recovered from DB
      return {
        matchId: row.id,
        players: [
          row.player1Name
            ? {
                playerId: 'recovered-p1',
                playerName: row.player1Name,
                playerIndex: 0,
                userId: row.player1Id ?? undefined,
                socket: null,
              }
            : null,
          row.player2Name
            ? {
                playerId: 'recovered-p2',
                playerName: row.player2Name,
                playerIndex: 1,
                userId: row.player2Id ?? undefined,
                socket: null,
              }
            : null,
        ],
        spectators: [],
        state: row.state as GameState,
        config: row.config as GameConfig,
        actionHistory: row.actionHistory as Action[],
        lastPreState: null,
        lifecycleEvents: [],
        createdAt: row.createdAt.getTime(),
        lastActivityAt: row.updatedAt.getTime(),
        botStrategy: row.botStrategy ?? undefined,
      };
    } catch (err) {
      console.error('Failed to get match from database:', err);
      return null;
    }
  }

  async saveTransactionLogEntry(
    matchId: string,
    sequenceNumber: number,
    entry: TransactionLogEntry,
    events: PhalanxEvent[],
  ): Promise<void> {
    const database = db;
    if (!database) return;

    try {
      await traceDbQuery(
        'db.transaction_logs.insert',
        { operation: 'INSERT', table: 'transaction_logs' },
        () =>
          database.insert(transactionLogs).values({
            matchId,
            sequenceNumber,
            action: entry.action,
            stateHashBefore: entry.stateHashBefore,
            stateHashAfter: entry.stateHashAfter,
            events,
          }),
      );
    } catch (err) {
      console.error('Failed to save transaction log entry:', err);
    }
  }

  async saveFinalStateHash(matchId: string, hash: string): Promise<void> {
    const database = db;
    if (!database) return;

    try {
      await traceDbQuery(
        'db.matches.update_final_hash',
        { operation: 'UPDATE', table: 'matches' },
        () => database.update(matches).set({ finalStateHash: hash }).where(eq(matches.id, matchId)),
      );
    } catch (err) {
      console.error('Failed to save final state hash:', err);
    }
  }

  async getFinalStateHash(matchId: string): Promise<string | null> {
    const database = db;
    if (!database) return null;

    try {
      const result = await traceDbQuery(
        'db.matches.select_final_hash',
        { operation: 'SELECT', table: 'matches' },
        () =>
          database
            .select({ finalStateHash: matches.finalStateHash })
            .from(matches)
            .where(eq(matches.id, matchId))
            .limit(1),
      );
      return result[0]?.finalStateHash ?? null;
    } catch (err) {
      console.error('Failed to get final state hash:', err);
      return null;
    }
  }

  /**
   * Verify hash chain continuity for a match's transaction log.
   * Each entry's stateHashBefore must equal the previous entry's stateHashAfter.
   */
  async verifyHashChain(matchId: string): Promise<{
    valid: boolean;
    actionCount: number;
    finalStateHash: string | null;
    error?: string;
    failedAtSequence?: number;
  }> {
    const database = db;
    if (!database)
      return {
        valid: false,
        actionCount: 0,
        finalStateHash: null,
        error: 'Database not available',
      };

    try {
      const rows = await traceDbQuery(
        'db.transaction_logs.select_hashes',
        { operation: 'SELECT', table: 'transaction_logs' },
        () =>
          database
            .select({
              sequenceNumber: transactionLogs.sequenceNumber,
              stateHashBefore: transactionLogs.stateHashBefore,
              stateHashAfter: transactionLogs.stateHashAfter,
            })
            .from(transactionLogs)
            .where(eq(transactionLogs.matchId, matchId))
            .orderBy(asc(transactionLogs.sequenceNumber)),
      );

      if (rows.length === 0) {
        return {
          valid: false,
          actionCount: 0,
          finalStateHash: null,
          error: 'No transaction log entries found',
        };
      }

      for (let i = 1; i < rows.length; i++) {
        const prev = rows[i - 1];
        const curr = rows[i];
        if (!prev || !curr) continue;
        if (curr.stateHashBefore !== prev.stateHashAfter) {
          return {
            valid: false,
            actionCount: rows.length,
            finalStateHash: null,
            error: `Hash chain break at sequence ${curr.sequenceNumber}: expected ${prev.stateHashAfter}, got ${curr.stateHashBefore}`,
            failedAtSequence: curr.sequenceNumber,
          };
        }
      }

      const finalHash = rows.at(-1)?.stateHashAfter ?? null;
      return { valid: true, actionCount: rows.length, finalStateHash: finalHash };
    } catch (err) {
      console.error('Failed to verify hash chain:', err);
      return { valid: false, actionCount: 0, finalStateHash: null, error: 'Database query failed' };
    }
  }

  async getTransactionLog(matchId: string): Promise<TransactionLogEntry[]> {
    const database = db;
    if (!database) return [];

    try {
      const rows = await traceDbQuery(
        'db.transaction_logs.select_by_match',
        { operation: 'SELECT', table: 'transaction_logs' },
        () =>
          database
            .select()
            .from(transactionLogs)
            .where(eq(transactionLogs.matchId, matchId))
            .orderBy(asc(transactionLogs.sequenceNumber)),
      );

      return rows.map((row) => ({
        sequenceNumber: row.sequenceNumber,
        action: row.action as Action,
        stateHashBefore: row.stateHashBefore,
        stateHashAfter: row.stateHashAfter,
        timestamp: row.createdAt.toISOString(),
        details:
          (row.events as PhalanxEvent[]).find((e) => e.type === 'functional_update')?.payload ?? {},
      })) as unknown as TransactionLogEntry[];
    } catch (err) {
      console.error('Failed to get transaction log:', err);
      return [];
    }
  }
}
