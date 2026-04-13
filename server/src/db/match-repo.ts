import { db } from './index.js';
import { matches, transactionLogs, users } from './schema.js';
import { desc, eq, asc, inArray } from 'drizzle-orm';
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
import { TelemetryName } from '@phalanxduel/shared';
import { SeverityNumber } from '@opentelemetry/api-logs';
import { emitOtlpLog } from '../instrument.js';

function isLifecycleEvent(event: PhalanxEvent): boolean {
  return (
    event.name === 'match.created' ||
    event.name === 'player.joined' ||
    event.name === TelemetryName.EVENT_PLAYER_DISCONNECTED ||
    event.name === TelemetryName.EVENT_PLAYER_RECONNECTED ||
    event.name === 'game.initialized' ||
    event.name === 'game.completed'
  );
}

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

interface RecoverPlayerParams {
  playerName: string | null;
  playerId: string;
  playerIndex: 0 | 1;
  userId: string | null;
  disconnectedAt?: string;
}

function recoverPlayer({
  playerName,
  playerId,
  playerIndex,
  userId,
  disconnectedAt,
}: RecoverPlayerParams) {
  if (!playerName) return null;
  return {
    playerId,
    playerName,
    playerIndex,
    userId: userId ?? undefined,
    socket: null,
    disconnectedAt,
  };
}

function recoverDisconnectedAtByPlayer(
  row: typeof matches.$inferSelect,
): Partial<Record<0 | 1, string>> {
  const persistedEventLog = row.eventLog as MatchEventLog | null;
  const disconnectedAtByPlayer: Partial<Record<0 | 1, string>> = {};

  for (const event of persistedEventLog?.events ?? []) {
    if (
      event.name !== TelemetryName.EVENT_PLAYER_DISCONNECTED &&
      event.name !== TelemetryName.EVENT_PLAYER_RECONNECTED
    ) {
      continue;
    }

    const payload = event.payload as { playerIndex?: number; disconnectedAt?: string } | null;
    const playerIndex = payload?.playerIndex;
    if (playerIndex !== 0 && playerIndex !== 1) continue;

    if (event.name === TelemetryName.EVENT_PLAYER_DISCONNECTED) {
      disconnectedAtByPlayer[playerIndex] = payload?.disconnectedAt ?? event.timestamp;
      continue;
    }

    delete disconnectedAtByPlayer[playerIndex];
  }

  return disconnectedAtByPlayer;
}

function recoverPlayers(
  row: typeof matches.$inferSelect,
  config: GameConfig | null,
): MatchInstance['players'] {
  const playerConfig = config?.players ?? [];
  const player0Id = playerConfig[0]?.id ?? 'recovered-p1';
  const player1Id = playerConfig[1]?.id ?? 'recovered-p2';
  const disconnectedAtByPlayer = recoverDisconnectedAtByPlayer(row);

  return [
    recoverPlayer({
      playerName: row.player1Name,
      playerId: player0Id,
      playerIndex: 0,
      userId: row.player1Id,
      disconnectedAt: disconnectedAtByPlayer[0],
    }),
    recoverPlayer({
      playerName: row.player2Name,
      playerId: player1Id,
      playerIndex: 1,
      userId: row.player2Id,
      disconnectedAt: disconnectedAtByPlayer[1],
    }),
  ];
}

function recoverLifecycleEvents(row: typeof matches.$inferSelect) {
  const persistedEventLog = row.eventLog as MatchEventLog | null;
  return persistedEventLog?.events.filter(isLifecycleEvent) ?? [];
}

function buildRecoveredMatch(row: typeof matches.$inferSelect): MatchInstance {
  const config = row.config as GameConfig | null;
  const botStrategy = row.botStrategy ?? undefined;

  return {
    matchId: row.id,
    players: recoverPlayers(row, config),
    spectators: [],
    state: row.state as GameState,
    config,
    actionHistory: row.actionHistory as Action[],
    gameOptions: config?.gameOptions,
    rngSeed: config?.rngSeed,
    matchParams: config?.matchParams,
    botConfig:
      botStrategy && config
        ? {
            strategy: botStrategy,
            seed: config.rngSeed,
          }
        : undefined,
    botPlayerIndex: botStrategy ? 1 : undefined,
    lastPreState: null,
    lifecycleEvents: recoverLifecycleEvents(row),
    createdAt: row.createdAt.getTime(),
    lastActivityAt: row.updatedAt.getTime(),
    botStrategy,
  };
}

export class MatchRepository {
  private async verifyUserIds(
    p1Id: string | null,
    p2Id: string | null,
  ): Promise<[string | null, string | null]> {
    if (!p1Id && !p2Id) return [null, null];

    const database = db;
    if (!database) return [null, null];

    try {
      const ids = [p1Id, p2Id].filter((id): id is string => !!id);
      const existingUsers = await traceDbQuery(
        'db.matches.verify_users',
        { operation: 'SELECT', table: 'users' },
        () => database.select({ id: users.id }).from(users).where(inArray(users.id, ids)),
      );
      const validIds = new Set(existingUsers.map((u) => u.id));
      return [p1Id && validIds.has(p1Id) ? p1Id : null, p2Id && validIds.has(p2Id) ? p2Id : null];
    } catch (err) {
      console.warn('MatchRepo: failed to verify users, falling back to null IDs:', err);
      return [null, null];
    }
  }

  async saveMatch(match: MatchInstance): Promise<void> {
    const database = db;
    if (!database) return;
    if (!match.config) return;

    // Verify user existence if IDs are provided to avoid FK violations (GHOST_USER protection)
    const [p1Id, p2Id] = await this.verifyUserIds(
      match.players[0]?.userId ?? null,
      match.players[1]?.userId ?? null,
    );

    const payload = {
      id: match.matchId,
      player1Id: p1Id,
      player2Id: p2Id,
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
      emitOtlpLog(SeverityNumber.ERROR, 'ERROR', 'Failed to get completed matches', {
        'db.operation': 'getCompletedMatches',
        'error.message': err instanceof Error ? err.message : String(err),
      });
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
      emitOtlpLog(SeverityNumber.ERROR, 'ERROR', 'Failed to save event log', {
        'db.operation': 'saveEventLog',
        'error.message': err instanceof Error ? err.message : String(err),
      });
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
      emitOtlpLog(SeverityNumber.ERROR, 'ERROR', 'Failed to get event log', {
        'db.operation': 'getEventLog',
        'error.message': err instanceof Error ? err.message : String(err),
      });
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
      return buildRecoveredMatch(row);
    } catch (err) {
      emitOtlpLog(SeverityNumber.ERROR, 'ERROR', 'Failed to get match from database', {
        'db.operation': 'getMatch',
        'error.message': err instanceof Error ? err.message : String(err),
      });
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
      emitOtlpLog(SeverityNumber.ERROR, 'ERROR', 'Failed to save transaction log entry', {
        'db.operation': 'saveTransactionLogEntry',
        'error.message': err instanceof Error ? err.message : String(err),
      });
      throw err;
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
      emitOtlpLog(SeverityNumber.ERROR, 'ERROR', 'Failed to save final state hash', {
        'db.operation': 'saveFinalStateHash',
        'error.message': err instanceof Error ? err.message : String(err),
      });
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
      emitOtlpLog(SeverityNumber.ERROR, 'ERROR', 'Failed to get final state hash', {
        'db.operation': 'getFinalStateHash',
        'error.message': err instanceof Error ? err.message : String(err),
      });
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
      emitOtlpLog(SeverityNumber.ERROR, 'ERROR', 'Failed to verify hash chain', {
        'db.operation': 'verifyHashChain',
        'error.message': err instanceof Error ? err.message : String(err),
      });
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
      emitOtlpLog(SeverityNumber.ERROR, 'ERROR', 'Failed to get transaction log', {
        'db.operation': 'getTransactionLog',
        'error.message': err instanceof Error ? err.message : String(err),
      });
      return [];
    }
  }
}
