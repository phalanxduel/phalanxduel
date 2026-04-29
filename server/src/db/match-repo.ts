import { db } from './index.js';
import { matches, transactionLogs, users } from './schema.js';
import { and, desc, eq, asc, inArray, or, isNull } from 'drizzle-orm';
import type { MatchInstance, PlayerConnection } from '../match.js';
import type { WebSocket } from 'ws';
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
  playerNames: (string | null)[];
  winnerIndex: number | null;
  victoryType: string | null;
  turnCount: number | null;
  fingerprint: string | null;
  createdAt: string;
  completedAt: string;
}

export interface UserActiveMatchSummary {
  matchId: string;
  playerId: string;
  playerIndex: 0 | 1;
  opponentName: string | null;
  botStrategy: 'random' | 'heuristic' | null;
  status: 'pending' | 'active';
  phase: string | null;
  turnNumber: number | null;
  createdAt: string;
  updatedAt: string;
}

interface RecoverPlayerParams {
  playerName: string | null;
  playerId: string;
  playerIndex: 0 | 1;
  userId: string | null;
  socket: WebSocket | null;
  disconnectedAt?: string;
}

function recoverPlayer({
  playerName,
  playerId,
  playerIndex,
  userId,
  socket,
  disconnectedAt,
}: RecoverPlayerParams): PlayerConnection | null {
  if (!playerName) return null;
  return {
    playerId,
    playerName,
    playerIndex,
    userId: userId ?? undefined,
    socket,
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
  const player0Id = playerConfig[0]?.id ?? (row.player1Id || 'recovered-p1');
  const player1Id = playerConfig[1]?.id ?? (row.player2Id || 'recovered-p2');
  const disconnectedAtByPlayer = recoverDisconnectedAtByPlayer(row);

  const players: [PlayerConnection | null, PlayerConnection | null] = [
    recoverPlayer({
      playerName: row.player1Name,
      playerId: player0Id,
      playerIndex: 0,
      userId: row.player1Id,
      socket: null,
      disconnectedAt: disconnectedAtByPlayer[0],
    }),
    recoverPlayer({
      playerName: row.player2Name,
      playerId: player1Id,
      playerIndex: 1,
      userId: row.player2Id,
      socket: null,
      disconnectedAt: disconnectedAtByPlayer[1],
    }),
  ];

  return players;
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
    visibility: (row.visibility ?? 'private') as MatchInstance['visibility'],
    publicStatus: row.publicStatus as MatchInstance['publicStatus'],
    publicExpiresAt: row.publicExpiresAt?.toISOString?.() ?? null,
    minPublicRating: row.minPublicRating ?? null,
    maxPublicRating: row.maxPublicRating ?? null,
    minGamesPlayed: row.minGamesPlayed ?? null,
    requiresEstablishedRating: row.requiresEstablishedRating,
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

function buildUserActiveMatchSummary(
  row: typeof matches.$inferSelect,
  userId: string,
): UserActiveMatchSummary | null {
  const playerIndex = row.player1Id === userId ? 0 : row.player2Id === userId ? 1 : null;
  if (playerIndex === null) return null;

  const config = row.config as GameConfig | null;
  const state = row.state as GameState | null;
  const playerId = config?.players?.[playerIndex]?.id;
  if (!playerId) return null;

  const opponentName =
    playerIndex === 0
      ? (row.player2Name ?? (row.botStrategy ? `Bot (${row.botStrategy})` : null))
      : row.player1Name;

  return {
    matchId: row.id,
    playerId,
    playerIndex,
    opponentName,
    botStrategy: row.botStrategy ?? null,
    status: row.status === 'pending' ? 'pending' : 'active',
    phase: state?.phase ?? null,
    turnNumber: state?.turnNumber ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function buildFallbackConfig(match: MatchInstance) {
  return {
    matchId: match.matchId,
    players: [
      {
        id: match.players[0]?.playerId ?? 'pending',
        name: match.players[0]?.playerName ?? 'Waiting...',
      },
      {
        id: match.players[1]?.playerId ?? 'pending',
        name: match.players[1]?.playerName ?? 'Waiting...',
      },
    ],
    rngSeed: match.rngSeed ?? 0,
    matchParams: match.matchParams || {
      rows: 6,
      columns: 7,
      maxHandSize: 12,
      initialDraw: 12,
    },
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

    // We allow saving matches even without a config (pending state) to ensure the
    // match record exists in the DB before any ledger actions are written.

    // Verify user existence if IDs are provided to avoid FK violations (GHOST_USER protection)
    const [p1Id, p2Id] = await this.verifyUserIds(
      match.players[0]?.userId ?? null,
      match.players[1]?.userId ?? null,
    );

    const payload = this.prepareMatchPayload(match, p1Id, p2Id);

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
      console.error(`[MatchRepo] CRITICAL: Failed to save match ${match.matchId}:`, err);
      throw err;
    }
  }

  async claimPublicOpenMatch(params: {
    matchId: string;
    player2Id: string | null;
    player2Name: string;
  }): Promise<boolean> {
    const database = db;
    if (!database) return false;

    try {
      const rows = await traceDbQuery(
        'db.matches.claim_public_open',
        {
          operation: 'UPDATE',
          table: 'matches',
        },
        () =>
          database
            .update(matches)
            .set({
              player2Id: params.player2Id,
              player2Name: params.player2Name,
              publicStatus: 'claimed',
              publicExpiresAt: null,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(matches.id, params.matchId),
                eq(matches.visibility, 'public_open'),
                eq(matches.publicStatus, 'open'),
                isNull(matches.player2Id),
              ),
            )
            .returning({ id: matches.id }),
      );
      return rows.length > 0;
    } catch (err) {
      emitOtlpLog(SeverityNumber.ERROR, 'ERROR', 'Failed to claim public open match', {
        'db.operation': 'claimPublicOpenMatch',
        'error.message': err instanceof Error ? err.message : String(err),
      });
      return false;
    }
  }

  private prepareMatchPayload(match: MatchInstance, p1Id: string | null, p2Id: string | null) {
    const status = (match.state?.phase === 'gameOver' ? 'completed' : 'active') as
      | 'pending'
      | 'active'
      | 'completed'
      | 'cancelled';

    return {
      id: match.matchId,
      player1Id: p1Id,
      player2Id: p2Id,
      visibility: match.visibility ?? 'private',
      publicStatus: match.publicStatus ?? null,
      publicExpiresAt: match.publicExpiresAt ? new Date(match.publicExpiresAt) : null,
      minPublicRating: match.minPublicRating ?? null,
      maxPublicRating: match.maxPublicRating ?? null,
      minGamesPlayed: match.minGamesPlayed ?? null,
      requiresEstablishedRating: match.requiresEstablishedRating ?? false,
      player1Name: match.players[0]?.playerName ?? null,
      player2Name: match.players[1]?.playerName ?? null,
      botStrategy: match.botStrategy ?? null,
      config: match.config ?? buildFallbackConfig(match),
      state: match.state,
      actionHistory: match.actionHistory,
      transactionLog: match.state?.transactionLog ?? [],
      outcome: match.state?.outcome ?? null,
      status,
      updatedAt: new Date(),
    };
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

  async listActiveMatchesForUser(userId: string): Promise<UserActiveMatchSummary[]> {
    const database = db;
    if (!database) return [];

    try {
      const rows = await traceDbQuery(
        'db.matches.select_active_for_user',
        { operation: 'SELECT', table: 'matches' },
        () =>
          database
            .select()
            .from(matches)
            .where(or(eq(matches.player1Id, userId), eq(matches.player2Id, userId)))
            .orderBy(desc(matches.updatedAt)),
      );

      return rows
        .filter((row) => row.status === 'pending' || row.status === 'active')
        .map((row) => buildUserActiveMatchSummary(row, userId))
        .filter((row): row is UserActiveMatchSummary => row !== null);
    } catch (err) {
      emitOtlpLog(SeverityNumber.ERROR, 'ERROR', 'Failed to list active matches for user', {
        'db.operation': 'listActiveMatchesForUser',
        'error.message': err instanceof Error ? err.message : String(err),
        'user.id': userId,
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

  async cancelPendingMatch(matchId: string, userId: string): Promise<boolean> {
    const database = db;
    if (!database) return false;

    try {
      const rows = await traceDbQuery(
        'db.matches.cancel_pending',
        { operation: 'UPDATE', table: 'matches' },
        () =>
          database
            .update(matches)
            .set({ status: 'cancelled', updatedAt: new Date() })
            .where(
              and(
                eq(matches.id, matchId),
                eq(matches.status, 'pending'),
                eq(matches.player1Id, userId),
              ),
            )
            .returning({ id: matches.id }),
      );
      return rows.length > 0;
    } catch (err) {
      emitOtlpLog(SeverityNumber.ERROR, 'ERROR', 'Failed to cancel pending match', {
        'db.operation': 'cancelPendingMatch',
        'error.message': err instanceof Error ? err.message : String(err),
      });
      return false;
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
