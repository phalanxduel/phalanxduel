import { randomUUID } from 'node:crypto';
import type { WebSocket } from 'ws';
import type {
  ServerMessage,
  PhalanxTurnResult,
  MatchEventLog,
  GameState,
  Action,
  PhalanxEvent,
} from '@phalanxduel/shared';
import {
  DEFAULT_MATCH_PARAMS,
  TelemetryName,
  normalizeCreateMatchParams,
} from '@phalanxduel/shared';
import { computeStateHash, computeTurnHash } from '@phalanxduel/shared/hash';
import { deriveEventsFromEntry, computeBotAction, type GameConfig } from '@phalanxduel/engine';
import { SeverityNumber } from '@opentelemetry/api-logs';
import { emitOtlpLog } from './instrument.js';
import { MatchRepository } from './db/match-repo.js';
import { MatchActor } from './match-actor.js';
import { type ILedgerStore, PostgresLedgerStore } from './db/ledger-store.js';
import { LadderService } from './ladder.js';
import { matchLifecycleTotal } from './metrics.js';
import { projectGameState, projectTurnResult } from './utils/projection.js';
import type { IEventBus } from './event-bus.js';

import {
  MatchError,
  ActionError,
  type MatchInstance,
  type LobbyMatchSummary,
  type PlayerConnection,
  type SpectatorConnection,
  type SocketInfo,
  type BotMatchOptions,
  type CreateMatchOptions,
  type IMatchManager,
} from './match-types.js';
export {
  MatchError,
  ActionError,
  type MatchInstance,
  type LobbyMatchSummary,
  type PlayerConnection,
  type SpectatorConnection,
  type SocketInfo,
  type BotMatchOptions,
  type CreateMatchOptions,
  type IMatchManager,
};

const MAX_ACTIVE_MATCHES_PER_IP = 3;
const MAX_SPECTATORS_PER_MATCH = 50;
const RECONNECT_WINDOW_MS = 2 * 60 * 1000; // 2 minutes
const SYSTEM_ERROR_EVENT_NAME = 'game.system_error';

function send(socket: WebSocket | null, message: ServerMessage): void {
  if (socket?.readyState === 1) {
    socket.send(JSON.stringify(message));
  }
}

/**
 * Builds the unified MatchEventLog for a match: lifecycle events prepended to
 * all turn-derived events in sequence order, with a SHA-256 fingerprint.
 */
export function buildMatchEventLog(match: MatchInstance): MatchEventLog {
  const turnEvents: PhalanxEvent[] = (match.state?.transactionLog ?? []).flatMap((entry) =>
    deriveEventsFromEntry(entry, match.matchId),
  );
  const events = [...match.lifecycleEvents, ...turnEvents, ...(match.fatalEvents ?? [])];
  const fingerprint = computeStateHash(events);
  return {
    matchId: match.matchId,
    events,
    fingerprint,
    generatedAt: new Date().toISOString(),
  };
}

function createUnrecoverableErrorEvent(
  match: MatchInstance,
  action: Action,
  error: Error,
): PhalanxEvent {
  const sequenceNumber = match.state?.transactionLog?.length ?? 0;
  const turnSpanId = `${match.matchId}:seq${sequenceNumber}:turn`;

  return {
    id: `${match.matchId}:seq${sequenceNumber}:fatal`,
    parentId: turnSpanId,
    type: 'system_error',
    name: SYSTEM_ERROR_EVENT_NAME,
    timestamp: action.timestamp,
    payload: {
      actionType: action.type,
      error: error.message,
      phase: match.state?.phase ?? null,
      turnNumber: match.state?.turnNumber ?? null,
      sequenceNumber,
    },
    status: 'unrecoverable_error',
  };
}

/** Redact both players' hands/drawpiles for spectator view */
export function filterStateForSpectator(state: GameState): GameState {
  return projectGameState(state, null).state;
}

/**
 * Redact opponent hand/drawpile/discard, replace with counts.
 * NOTE: Legacy tests often use this to get a 'full' state by passing the active player index.
 */
export function filterStateForPlayer(state: GameState, playerIndex: number): GameState {
  // If we want to maintain compatibility with tests that expect NO redaction
  // when viewing as oneself, we must ensure projectGameState does that.
  return projectGameState(state, playerIndex).state;
}

/** TTL constants in milliseconds */
const GAME_OVER_TTL = 5 * 60 * 1000; // 5 minutes
const ABANDONED_TTL = 10 * 60 * 1000; // 10 minutes

export class LocalMatchManager implements IMatchManager {
  private readonly recoveryWindowStartedAt = Date.now();
  actors = new Map<string, MatchActor>();
  get matches(): Map<string, MatchInstance> {
    const map = new Map<string, MatchInstance>();
    for (const [id, actor] of this.actors) {
      map.set(id, actor.match);
    }
    return map;
  }
  private readonly initLocks = new Set<string>();
  socketMap = new Map<WebSocket, SocketInfo>();
  /** Tracks matches currently being loaded from the database to prevent duplicate actor creation */
  private loadingMatchIds = new Map<string, Promise<MatchInstance | null>>();
  /** Tracks pending reconnect timeouts keyed by `matchId:playerId` */
  disconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();
  onMatchRemoved: (() => void) | null = null;
  public matchRepo: MatchRepository;
  private ledgerStore: ILedgerStore;
  private ladderService: LadderService;
  private eventBus: IEventBus | undefined;

  constructor(
    matchRepo?: MatchRepository,
    ledgerStore?: ILedgerStore,
    ladderService?: LadderService,
    eventBus?: IEventBus,
  ) {
    this.matchRepo = matchRepo ?? new MatchRepository();
    this.eventBus = eventBus;
    this.ledgerStore = ledgerStore ?? new PostgresLedgerStore(this.eventBus);
    this.ladderService = ladderService ?? new LadderService();
  }

  async getMatch(matchId: string): Promise<MatchInstance | null> {
    const actor = this.actors.get(matchId);
    if (actor) return actor.match;

    const existingLoading = this.loadingMatchIds.get(matchId);
    if (existingLoading) return existingLoading;

    const loadPromise = (async () => {
      try {
        const dbMatch = await this.matchRepo.getMatch(matchId);
        if (dbMatch) {
          this.armRecoveredReconnectTimers(dbMatch);
          const actor = new MatchActor(matchId, dbMatch, this.ledgerStore);
          this.actors.set(matchId, actor);
          const onSync = () => {
            this.broadcastState(dbMatch);
          };
          await actor.rehydrate();
          if (this.eventBus) {
            await actor.subscribeToUpdates(this.eventBus, onSync);
          }
          this.scheduleBotTurn(dbMatch);
          return dbMatch;
        }
        return null;
      } finally {
        this.loadingMatchIds.delete(matchId);
      }
    })();

    this.loadingMatchIds.set(matchId, loadPromise);
    return loadPromise;
  }

  getMatchSync(matchId: string): MatchInstance | undefined {
    return this.actors.get(matchId)?.match;
  }

  broadcastMatchState(matchId: string): void {
    void (async () => {
      const match = await this.getMatch(matchId);
      if (match) {
        this.broadcastState(match);
      }
    })();
  }

  async createMatch(
    playerName: string,
    socket: WebSocket | null,
    options?: CreateMatchOptions,
  ): Promise<{ matchId: string; playerId: string; playerIndex: number }> {
    const { gameOptions, rngSeed, botOptions, matchParams, userId, creatorIp } = options ?? {};
    const normalizedMatchParamsResult = normalizeCreateMatchParams(matchParams);

    if (!normalizedMatchParamsResult.success) {
      const detail = normalizedMatchParamsResult.error.issues[0]?.message ?? 'Invalid match params';
      throw new MatchError(`Invalid config: ${detail}`, 'INVALID_MATCH_PARAMS');
    }

    const resolvedMatchParams = normalizedMatchParamsResult.data;

    // Enforce IP-based limit for active matches
    if (creatorIp) {
      const activeFromIp = Array.from(this.matches.values()).filter(
        (m) => m.creatorIp === creatorIp && m.state?.phase !== 'gameOver',
      ).length;

      if (activeFromIp >= MAX_ACTIVE_MATCHES_PER_IP) {
        throw new MatchError(
          `Too many active matches from this IP (max ${MAX_ACTIVE_MATCHES_PER_IP})`,
          'MATCH_LIMIT_REACHED',
        );
      }
    }

    const matchId = randomUUID();
    const playerId = randomUUID();
    const playerIndex = 0;

    const player: PlayerConnection = {
      playerId,
      playerName,
      playerIndex,
      userId,
      socket,
      disconnectedAt: undefined,
    };

    const now = Date.now();
    const createdAt = new Date(now).toISOString();
    const match: MatchInstance = {
      matchId,
      creatorIp,
      players: [player, null],
      spectators: [],
      state: null,
      config: null,
      actionHistory: [],
      gameOptions,
      rngSeed,
      matchParams: resolvedMatchParams,
      lastPreState: null,
      lifecycleEvents: [],
      fatalEvents: [],
      createdAt: now,
      lastActivityAt: now,
    };

    // match.created: record match parameters (rngSeed omitted for fairness)
    match.lifecycleEvents.push({
      id: `${matchId}:lc:match_created`,
      type: 'functional_update',
      name: TelemetryName.EVENT_MATCH_CREATED,
      timestamp: createdAt,
      payload: {
        matchId,
        params: {
          ...resolvedMatchParams,
          gameOptions: gameOptions ?? null,
        },
        createdAt,
      },
      status: 'ok',
    });

    // player.joined for the match creator (P0)
    match.lifecycleEvents.push({
      id: `${matchId}:lc:player_0_joined`,
      type: 'functional_update',
      name: TelemetryName.EVENT_PLAYER_JOINED,
      timestamp: createdAt,
      payload: { playerId, playerIndex: 0, isBot: false, joinedAt: createdAt },
      status: 'ok',
    });

    if (botOptions) {
      const botPlayerId = randomUUID();
      const botPlayer: PlayerConnection = {
        playerId: botPlayerId,
        playerName: botOptions.opponent === 'bot-heuristic' ? 'Bot (Heuristic)' : 'Bot (Random)',
        playerIndex: 1,
        socket: null,
        disconnectedAt: undefined,
      };
      match.players[1] = botPlayer;
      match.botConfig = botOptions.botConfig;
      match.botPlayerIndex = 1;
      match.botStrategy = botOptions.opponent === 'bot-heuristic' ? 'heuristic' : 'random';

      // player.joined for the bot (P1)
      match.lifecycleEvents.push({
        id: `${matchId}:lc:player_1_joined`,
        type: 'functional_update',
        name: TelemetryName.EVENT_PLAYER_JOINED,
        timestamp: createdAt,
        payload: { playerId: botPlayerId, playerIndex: 1, isBot: true, joinedAt: createdAt },
        status: 'ok',
      });
    }

    match.config = {
      matchId,
      players: [
        { id: playerId, name: playerName },
        { id: 'pending', name: 'Waiting...' },
      ],
      rngSeed: match.rngSeed ?? Date.now(),
      matchParams: match.matchParams ?? DEFAULT_MATCH_PARAMS,
      gameOptions: match.gameOptions,
    } as unknown as GameConfig;

    const actor = new MatchActor(matchId, match, this.ledgerStore);
    this.actors.set(matchId, actor);

    if (socket) {
      this.socketMap.set(socket, { matchId, playerId, isSpectator: false });
    }

    matchLifecycleTotal.add('started');

    // CRITICAL: Ensure the match record exists in the DB before any ledger actions are written.
    // This prevents foreign key violations in Postgres when MatchActor initializes the game.
    await this.matchRepo.saveMatch(match);

    // For bot matches, initialize the game immediately
    if (botOptions) {
      if (!this.initLocks.has(matchId)) {
        this.initLocks.add(matchId);
        try {
          // Wait for game config
          console.log('[DEBUG] LocalMatchManager joining actor init for', matchId);
          await actor.initializeGame(async () => {
            await this.matchRepo.saveMatch(actor.match);
            this.broadcastState(actor.match);
            this.scheduleBotTurn(actor.match);
          }, this.eventBus);
        } finally {
          this.initLocks.delete(matchId);
        }
      }
    }

    await this.matchRepo.saveEventLog(matchId, buildMatchEventLog(match));

    return { matchId, playerId, playerIndex };
  }

  async createPendingMatch(matchId = randomUUID()): Promise<{ matchId: string }> {
    const now = Date.now();
    const createdAt = new Date(now).toISOString();
    const match: MatchInstance = {
      matchId,
      players: [null, null],
      spectators: [],
      state: null,
      config: null,
      actionHistory: [],
      lastPreState: null,
      lifecycleEvents: [],
      fatalEvents: [],
      createdAt: now,
      lastActivityAt: now,
    };

    match.lifecycleEvents.push({
      id: `${matchId}:lc:match_created`,
      type: 'functional_update',
      name: TelemetryName.EVENT_MATCH_CREATED,
      timestamp: createdAt,
      payload: {
        matchId,
        params: {
          rows: DEFAULT_MATCH_PARAMS.rows,
          columns: DEFAULT_MATCH_PARAMS.columns,
          maxHandSize: DEFAULT_MATCH_PARAMS.maxHandSize,
          initialDraw: DEFAULT_MATCH_PARAMS.initialDraw,
          gameOptions: null,
        },
        createdAt,
      },
      status: 'ok',
    });

    this.actors.set(matchId, new MatchActor(matchId, match, this.ledgerStore));
    await this.matchRepo.saveMatch(match);
    return { matchId };
  }

  listJoinableMatches(): LobbyMatchSummary[] {
    return [...this.actors.values()]
      .map((a) => a.match)
      .filter((match) => match.state?.phase !== 'gameOver')
      .filter((match) => match.players[0] === null || match.players[1] === null)
      .map((match) => {
        const openSeat: LobbyMatchSummary['openSeat'] = match.players[0] === null ? 'P0' : 'P1';
        return {
          matchId: match.matchId,
          openSeat,
          players: match.players
            .map((player) =>
              player
                ? { name: player.playerName, connected: player.socket?.readyState === 1 }
                : null,
            )
            .filter((player): player is { name: string; connected: boolean } => player !== null),
          phase: match.state?.phase ?? null,
          turnNumber: match.state?.turnNumber ?? null,
          createdAt: match.createdAt,
          lastActivityAt: match.lastActivityAt,
        };
      })
      .sort((a, b) => b.lastActivityAt - a.lastActivityAt);
  }

  async joinMatch(
    matchId: string,
    playerName: string,
    socket: WebSocket | null,
    userId?: string,
  ): Promise<{ playerId: string; playerIndex: number }> {
    const match = await this.getMatch(matchId);
    if (!match) {
      throw new MatchError('Match not found', 'MATCH_NOT_FOUND');
    }
    if (match.players[0] !== null && match.players[1] !== null) {
      throw new MatchError('Match is full', 'MATCH_FULL');
    }

    const playerId = randomUUID();
    const playerIndex = match.players[0] === null ? 0 : 1;

    const player: PlayerConnection = {
      playerId,
      playerName,
      playerIndex,
      userId,
      socket,
      disconnectedAt: undefined,
    };

    match.players[playerIndex] = player;
    match.lastActivityAt = Date.now();
    if (socket) {
      this.socketMap.set(socket, { matchId, playerId, isSpectator: false });
    }

    const joinedAt = new Date().toISOString();
    match.lifecycleEvents.push({
      id: `${matchId}:lc:player_${playerIndex}_joined`,
      type: 'functional_update',
      name: TelemetryName.EVENT_PLAYER_JOINED,
      timestamp: joinedAt,
      payload: { playerId, playerIndex, isBot: false, joinedAt },
      status: 'ok',
    });

    // REST-created pending matches may have no host yet; only initialize once both slots are filled.
    if (match.players[0] === null || match.players[1] === null || match.state) {
      return { playerId, playerIndex };
    }

    // Atomic-ish check for initialization to prevent races when both players join at once.
    if (this.initLocks.has(matchId)) {
      return { playerId, playerIndex };
    }
    this.initLocks.add(matchId);

    // CRITICAL: Ensure the match record exists in the DB before any ledger actions are written.
    // This prevents foreign key violations in Postgres when MatchActor initializes the game.
    await this.matchRepo.saveMatch(match);

    try {
      const actor = this.actors.get(matchId);
      if (actor) {
        await actor.initializeGame(async () => {
          await this.matchRepo.saveMatch(actor.match);
          this.broadcastState(actor.match);
          this.scheduleBotTurn(actor.match);
        }, this.eventBus);
      }
      await this.matchRepo.saveEventLog(matchId, buildMatchEventLog(match));
    } finally {
      this.initLocks.delete(matchId);
    }

    // Note: caller is responsible for sending matchJoined before calling broadcastState
    return { playerId, playerIndex };
  }

  async rejoinMatch(
    matchId: string,
    playerId: string,
    socket: WebSocket,
  ): Promise<{ playerIndex: number }> {
    const match = await this.getMatch(matchId);
    if (!match) {
      throw new MatchError('Match not found', 'MATCH_NOT_FOUND');
    }

    const player = match.players.find((p) => p?.playerId === playerId);
    if (!player) {
      throw new MatchError('Player not found in this match', 'PLAYER_NOT_FOUND');
    }

    if (player.socket?.readyState === 1) {
      throw new MatchError('Player is already connected', 'ALREADY_CONNECTED');
    }

    // Cancel the forfeit timer
    const timerKey = `${matchId}:${playerId}`;
    const timer = this.disconnectTimers.get(timerKey);
    if (timer) {
      clearTimeout(timer);
      this.disconnectTimers.delete(timerKey);
    }

    // Swap in the new socket
    player.socket = socket;
    player.disconnectedAt = undefined;
    match.lastActivityAt = Date.now();
    this.socketMap.set(socket, { matchId, playerId, isSpectator: false });

    const reconnectedAt = new Date(match.lastActivityAt).toISOString();
    match.lifecycleEvents.push({
      id: `${matchId}:lc:player_${player.playerIndex}_reconnected:${match.lastActivityAt}`,
      type: 'functional_update',
      name: TelemetryName.EVENT_PLAYER_RECONNECTED,
      timestamp: reconnectedAt,
      payload: {
        playerId,
        playerIndex: player.playerIndex,
        reconnectedAt,
      },
      status: 'ok',
    });

    // Notify opponent
    const opponent = match.players.find((p) => p !== null && p.playerId !== playerId);
    if (opponent) {
      send(opponent.socket, { type: 'opponentReconnected', matchId });
    }

    await this.matchRepo.saveMatch(match);
    await this.matchRepo.saveEventLog(matchId, buildMatchEventLog(match));

    return { playerIndex: player.playerIndex };
  }

  async watchMatch(matchId: string, socket: WebSocket): Promise<{ spectatorId: string }> {
    const match = await this.getMatch(matchId);
    if (!match) {
      throw new MatchError('Match not found', 'MATCH_NOT_FOUND');
    }

    if (match.spectators.length >= MAX_SPECTATORS_PER_MATCH) {
      throw new MatchError(
        `Too many spectators for this match (max ${MAX_SPECTATORS_PER_MATCH})`,
        'SPECTATOR_LIMIT_REACHED',
      );
    }

    const spectatorId = randomUUID();
    const spectator: SpectatorConnection = { spectatorId, socket };

    match.spectators.push(spectator);
    match.lastActivityAt = Date.now();
    this.socketMap.set(socket, { matchId, spectatorId, isSpectator: true });

    return { spectatorId };
  }

  updatePlayerIdentity(socket: WebSocket, userId: string, playerName: string): void {
    const info = this.socketMap.get(socket);
    if (!info || info.isSpectator) return;
    const match = this.matches.get(info.matchId);
    if (!match) return;
    const player = match.players.find((p) => p?.playerId === info.playerId);
    if (!player) return;
    player.userId = userId;
    player.playerName = playerName;
  }

  handleDisconnect(socket: WebSocket): void {
    void (async () => {
      const info = this.socketMap.get(socket);
      if (!info) return;

      this.socketMap.delete(socket);
      const match = await this.getMatch(info.matchId);
      if (!match) return;

      if (info.isSpectator) {
        const idx = match.spectators.findIndex((s) => s.spectatorId === info.spectatorId);
        if (idx !== -1) match.spectators.splice(idx, 1);
        // Re-broadcast so players see updated spectator count
        this.broadcastState(match);
        return;
      }

      const player = match.players.find((p) => p?.playerId === info.playerId);
      if (player) {
        player.socket = null;
        player.disconnectedAt = new Date().toISOString();
        match.lastActivityAt = Date.now();
        match.lifecycleEvents.push({
          id: `${info.matchId}:lc:player_${player.playerIndex}_disconnected:${match.lastActivityAt}`,
          type: 'functional_update',
          name: TelemetryName.EVENT_PLAYER_DISCONNECTED,
          timestamp: player.disconnectedAt,
          payload: {
            playerId: info.playerId,
            playerIndex: player.playerIndex,
            disconnectedAt: player.disconnectedAt,
          },
          status: 'ok',
        });
      }

      // Notify opponent
      const opponent = match.players.find((p) => p !== null && p.playerId !== info.playerId);
      if (opponent) {
        send(opponent.socket, {
          type: 'opponentDisconnected',
          matchId: info.matchId,
        });
      }

      // Start reconnect timer — forfeit after RECONNECT_WINDOW_MS if game is active
      if (match.state && match.state.phase !== 'gameOver') {
        const timerKey = `${info.matchId}:${info.playerId}`;
        // Don't double-start if there's already a timer (shouldn't happen, but be safe)
        if (!this.disconnectTimers.has(timerKey)) {
          const timer = setTimeout(() => {
            this.disconnectTimers.delete(timerKey);
            void this.forfeitDisconnectedPlayer(info.matchId, info.playerId);
          }, RECONNECT_WINDOW_MS);
          this.disconnectTimers.set(timerKey, timer);
        }
      }

      await this.matchRepo.saveMatch(match);
      await this.matchRepo.saveEventLog(info.matchId, buildMatchEventLog(match));
    })();
  }

  /** Forfeit a disconnected player after the reconnect window expires. */
  private async forfeitDisconnectedPlayer(matchId: string, playerId: string): Promise<void> {
    const match = await this.getMatch(matchId);
    if (!match?.state || match.state.phase === 'gameOver') return;

    const player = match.players.find((p) => p?.playerId === playerId);
    // If they reconnected in the meantime, their socket won't be null
    if (!player || player.socket?.readyState === 1) return;

    try {
      await this.handleAction(matchId, playerId, {
        type: 'forfeit',
        playerIndex: player.playerIndex,
        timestamp: new Date().toISOString(),
      });
    } catch {
      // Match may have ended naturally — ignore
    }
  }

  private armRecoveredReconnectTimers(match: MatchInstance): void {
    if (!match.state || match.state.phase === 'gameOver') return;

    for (const player of match.players) {
      if (!player) continue;
      if (match.botPlayerIndex === player.playerIndex) continue;

      const timerKey = `${match.matchId}:${player.playerId}`;
      if (this.disconnectTimers.has(timerKey)) continue;

      const remainingMs = this.getRecoveredReconnectWindowMs(player);
      if (remainingMs <= 0) continue;

      const timer = setTimeout(() => {
        this.disconnectTimers.delete(timerKey);
        void this.forfeitDisconnectedPlayer(match.matchId, player.playerId);
      }, remainingMs);
      this.disconnectTimers.set(timerKey, timer);
    }
  }

  private getRecoveredReconnectWindowMs(player: PlayerConnection): number {
    if (!player.disconnectedAt) {
      return RECONNECT_WINDOW_MS - (Date.now() - this.recoveryWindowStartedAt);
    }

    const disconnectedAtMs = Date.parse(player.disconnectedAt);
    if (Number.isNaN(disconnectedAtMs)) {
      return 0;
    }
    return RECONNECT_WINDOW_MS - (Date.now() - disconnectedAtMs);
  }

  /** Remove stale matches: gameOver after 5 min, abandoned after 10 min */
  cleanupMatches(): number {
    const now = Date.now();
    let removed = 0;
    for (const [matchId, actor] of this.actors) {
      const match = actor.match;
      const isGameOver = match.state?.phase === 'gameOver';
      const elapsed = now - match.lastActivityAt;
      if ((isGameOver && elapsed > GAME_OVER_TTL) || elapsed > ABANDONED_TTL) {
        if (!isGameOver) {
          matchLifecycleTotal.add('abandoned');
        }
        // Clean up player socket references
        for (const player of match.players) {
          if (player?.socket) {
            this.socketMap.delete(player.socket);
          }
        }
        // Clean up spectator socket references
        for (const spectator of match.spectators) {
          if (spectator.socket) {
            this.socketMap.delete(spectator.socket);
          }
        }
        this.actors.delete(matchId);
        this.onMatchRemoved?.();
        removed++;
      }
    }
    return removed;
  }

  async handleAction(
    matchId: string,
    playerId: string,
    action: Action,
  ): Promise<PhalanxTurnResult> {
    const actor = this.actors.get(matchId);
    if (!actor) {
      throw new ActionError(matchId, 'Match not found', 'MATCH_NOT_FOUND');
    }

    actor.match.lastActivityAt = Date.now();

    return actor.dispatchAction(playerId, action, {
      onSuccess: async (match) => {
        if (match.state?.phase === 'gameOver') {
          this.maybeEmitGameCompleted(match, matchId);
        }

        this.broadcastState(match);
        this.scheduleBotTurn(match);
        await this.matchRepo.saveMatch(match);
        await this.matchRepo.saveEventLog(matchId, buildMatchEventLog(match));

        if (match.state?.phase === 'gameOver') {
          const finalHash = computeStateHash(match.state);
          await this.matchRepo.saveFinalStateHash(matchId, finalHash);

          await this.ladderService.onMatchComplete({
            player1Id: match.players[0]?.userId ?? null,
            player2Id: match.players[1]?.userId ?? null,
            botStrategy: match.botStrategy ?? null,
          });
        }
      },
      onError: async (match, err) => {
        await this.handleValidatedActionError(match, matchId, action, err);
      },
    });
  }

  private async handleValidatedActionError(
    match: MatchInstance,
    matchId: string,
    action: Action,
    error: unknown,
  ): Promise<never> {
    if (error instanceof ActionError) {
      throw error;
    }

    const fatalError = error instanceof Error ? error : new Error('Unknown unrecoverable error');
    const fatalEvent = createUnrecoverableErrorEvent(match, action, fatalError);
    match.fatalEvents = [...(match.fatalEvents ?? []), fatalEvent];
    match.lastEvents = [fatalEvent];

    emitOtlpLog(SeverityNumber.ERROR, 'ERROR', fatalError.message, {
      'game.match_id': matchId,
      'game.action.type': action.type,
    });

    await this.matchRepo.saveEventLog(matchId, buildMatchEventLog(match));

    throw new ActionError(matchId, fatalError.message, 'MATCH_UNRECOVERABLE_ERROR');
  }

  /** Emits game.completed once when the match first reaches gameOver. */
  private maybeEmitGameCompleted(match: MatchInstance, matchId: string): void {
    const alreadyCompleted = match.lifecycleEvents.some(
      (e) => e.name === TelemetryName.EVENT_GAME_COMPLETED,
    );
    if (alreadyCompleted) return;

    const completedAt = new Date().toISOString();
    const state = match.state;
    if (!state) return;
    const outcome = state.outcome;
    match.lifecycleEvents.push({
      id: `${matchId}:lc:game_completed`,
      type: 'functional_update',
      name: TelemetryName.EVENT_GAME_COMPLETED,
      timestamp: completedAt,
      payload: {
        winnerIndex: outcome?.winnerIndex ?? null,
        victoryType: outcome?.victoryType ?? null,
        turnNumber: outcome?.turnNumber ?? state.turnNumber,
        finalLp: [state.players[0]?.lifepoints ?? 0, state.players[1]?.lifepoints ?? 0],
        durationMs: Date.now() - match.createdAt,
      },
      status: 'ok',
    });
  }

  private scheduleBotTurn(match: MatchInstance): void {
    if (!match.botConfig || !match.state) return;
    if (match.state.phase === 'gameOver') return;

    if (match.botPlayerIndex == null) return;
    const botIdx = match.botPlayerIndex;
    if (match.state.activePlayerIndex !== botIdx) return;

    const botPlayer = match.players[botIdx];
    if (!botPlayer) return;

    setTimeout(() => {
      if (!match.state || match.state.phase === 'gameOver') return;
      if (match.state.activePlayerIndex !== botIdx) return;
      if (!match.botConfig) return;

      const turnSeed = match.botConfig.seed + match.state.turnNumber;
      const action = computeBotAction(match.state, botIdx, {
        ...match.botConfig,
        seed: turnSeed,
      });

      void this.handleAction(match.matchId, botPlayer.playerId, action).catch(() => {
        // Bot generated invalid action — handleAction already logs via telemetry
      });
      // handleAction calls broadcastState and scheduleBotTurn, so no recursion needed
    }, 300);
  }

  private broadcastState(match: MatchInstance): void {
    if (!match.state) return;
    const spectatorCount = match.spectators.length;
    const lastAction = match.actionHistory[match.actionHistory.length - 1] ?? {
      type: 'system:init',
      timestamp: new Date().toISOString(),
    };
    const lastEntry = match.state.transactionLog?.at(-1);
    const turnHash =
      lastEntry && match.lastEvents?.length
        ? computeTurnHash(
            lastEntry.stateHashAfter,
            match.lastEvents.map((e) => e.id),
          )
        : undefined;

    const preStateSource = match.lastPreState ?? match.state;

    for (const player of match.players) {
      if (player?.socket) {
        const viewModel = projectTurnResult({
          matchId: match.matchId,
          preState: preStateSource,
          postState: match.state,
          action: lastAction,
          events: match.lastEvents ?? [],
          viewerIndex: player.playerIndex,
        });
        send(player.socket, {
          type: 'gameState',
          matchId: match.matchId,
          result: {
            matchId: match.matchId,
            playerId: player.playerId,

            preState: viewModel.preState,

            postState: viewModel.postState,
            action: lastAction,
            events: match.lastEvents ?? [],
            turnHash,
          },

          viewModel, // Phase 1: Add new ViewModel to existing message
          spectatorCount,
        });
      }
    }

    for (const spectator of match.spectators) {
      if (spectator.socket) {
        const viewModel = projectTurnResult({
          matchId: match.matchId,
          preState: preStateSource,
          postState: match.state,
          action: lastAction,
          events: match.lastEvents ?? [],
          viewerIndex: null, // Spectator view
        });
        send(spectator.socket, {
          type: 'gameState',
          matchId: match.matchId,
          result: {
            matchId: match.matchId,
            playerId: 'spectator',

            preState: viewModel.preState,

            postState: viewModel.postState,
            action: lastAction,
            events: match.lastEvents ?? [],
            turnHash,
          },

          viewModel, // Phase 1: Add new ViewModel to existing message
          spectatorCount,
        });
      }
    }
  }
}
