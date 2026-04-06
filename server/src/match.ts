import { randomUUID } from 'node:crypto';
import type { WebSocket } from 'ws';
import type {
  GameState,
  Action,
  ServerMessage,
  GameOptions,
  CreateMatchParamsPartial,
  MatchParameters,
  PhalanxTurnResult,
  PhalanxEvent,
  MatchEventLog,
} from '@phalanxduel/shared';
import {
  DEFAULT_MATCH_PARAMS,
  TelemetryName,
  normalizeCreateMatchParams,
} from '@phalanxduel/shared';
import { computeStateHash, computeTurnHash } from '@phalanxduel/shared/hash';
import {
  createInitialState,
  applyAction,
  computeBotAction,
  deriveEventsFromEntry,
  validateAction,
  type BotConfig,
} from '@phalanxduel/engine';
import type { GameConfig } from '@phalanxduel/engine';
import { recordAction, recordPhaseTransition } from './telemetry.js';
import { SeverityNumber } from '@opentelemetry/api-logs';
import { emitOtlpLog } from './instrument.js';
import { MatchRepository } from './db/match-repo.js';
import { LadderService } from './ladder.js';
import { matchLifecycleTotal } from './metrics.js';
import { projectGameState, projectTurnResult } from './utils/projection.js';

export class MatchError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'MatchError';
  }
}

export class ActionError extends Error {
  constructor(
    public readonly matchId: string,
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'ActionError';
  }
}

interface PlayerConnection {
  playerId: string;
  playerName: string;
  playerIndex: number;
  userId?: string;
  socket: WebSocket | null;
  disconnectedAt?: string;
}

interface SpectatorConnection {
  spectatorId: string;
  socket: WebSocket | null;
}

type SocketInfo =
  | { matchId: string; playerId: string; isSpectator: false }
  | { matchId: string; spectatorId: string; isSpectator: true };

export interface BotMatchOptions {
  opponent: 'bot-random' | 'bot-heuristic';
  botConfig: BotConfig;
}

interface CreateMatchOptions {
  gameOptions?: GameOptions;
  rngSeed?: number;
  botOptions?: BotMatchOptions;
  matchParams?: CreateMatchParamsPartial;
  userId?: string;
  creatorIp?: string;
}

export interface MatchInstance {
  matchId: string;
  creatorIp?: string;
  players: [PlayerConnection | null, PlayerConnection | null];
  spectators: SpectatorConnection[];
  state: GameState | null;
  config: GameConfig | null;
  actionHistory: Action[];
  gameOptions?: GameOptions;
  rngSeed?: number;
  matchParams?: MatchParameters;
  botConfig?: BotConfig;
  botPlayerIndex?: 0 | 1;
  botStrategy?: 'random' | 'heuristic';
  lastEvents?: PhalanxEvent[];
  lastPreState: GameState | null;
  lifecycleEvents: PhalanxEvent[];
  fatalEvents?: PhalanxEvent[];
  createdAt: number;
  lastActivityAt: number;
}

export interface LobbyMatchSummary {
  matchId: string;
  openSeat: 'P0' | 'P1';
  players: { name: string; connected: boolean }[];
  phase: string | null;
  turnNumber: number | null;
  createdAt: number;
  lastActivityAt: number;
}

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

function hasUnrecoverableError(match: MatchInstance): boolean {
  return (match.fatalEvents ?? []).some((event) => event.status === 'unrecoverable_error');
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

export interface IMatchManager {
  getMatch(matchId: string): Promise<MatchInstance | null>;
  getMatchSync(matchId: string): MatchInstance | undefined;
  broadcastMatchState(matchId: string): void;
  createMatch(
    playerName: string,
    socket: WebSocket | null,
    options?: CreateMatchOptions,
  ): { matchId: string; playerId: string; playerIndex: number };
  createPendingMatch(matchId?: string): { matchId: string };
  listJoinableMatches(): LobbyMatchSummary[];
  joinMatch(
    matchId: string,
    playerName: string,
    socket: WebSocket | null,
    userId?: string,
  ): Promise<{ playerId: string; playerIndex: number }>;
  rejoinMatch(
    matchId: string,
    playerId: string,
    socket: WebSocket,
  ): Promise<{ playerIndex: number }>;
  watchMatch(matchId: string, socket: WebSocket): Promise<{ spectatorId: string }>;
  updatePlayerIdentity(socket: WebSocket, userId: string, playerName: string): void;
  handleDisconnect(socket: WebSocket): void;
  cleanupMatches(): number;
  handleAction(matchId: string, playerId: string, action: Action): Promise<PhalanxTurnResult>;
  onMatchRemoved: (() => void) | null;
  socketMap: Map<WebSocket, SocketInfo>;
  matches: Map<string, MatchInstance>;
}

export class MatchManager implements IMatchManager {
  private readonly recoveryWindowStartedAt = Date.now();
  matches = new Map<string, MatchInstance>();
  socketMap = new Map<WebSocket, SocketInfo>();
  /** Tracks pending reconnect timeouts keyed by `matchId:playerId` */
  disconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();
  onMatchRemoved: (() => void) | null = null;
  private matchRepo = new MatchRepository();
  private ladderService = new LadderService();

  async getMatch(matchId: string): Promise<MatchInstance | null> {
    const match = this.matches.get(matchId);
    if (match) return match;

    const dbMatch = await this.matchRepo.getMatch(matchId);
    if (dbMatch) {
      this.armRecoveredReconnectTimers(dbMatch);
      this.matches.set(matchId, dbMatch);
      this.scheduleBotTurn(dbMatch);
      return dbMatch;
    }

    return null;
  }

  getMatchSync(matchId: string): MatchInstance | undefined {
    return this.matches.get(matchId);
  }

  broadcastMatchState(matchId: string): void {
    void (async () => {
      const match = await this.getMatch(matchId);
      if (match) {
        this.broadcastState(match);
      }
    })();
  }

  createMatch(
    playerName: string,
    socket: WebSocket | null,
    options?: CreateMatchOptions,
  ): { matchId: string; playerId: string; playerIndex: number } {
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

    this.matches.set(matchId, match);
    if (socket) {
      this.socketMap.set(socket, { matchId, playerId, isSpectator: false });
    }

    matchLifecycleTotal.add('created');

    // For bot matches, initialize the game immediately
    if (botOptions) {
      this.initializeGame(match);
    }

    void this.matchRepo.saveMatch(match);
    if (match.config) {
      void this.matchRepo.saveEventLog(matchId, buildMatchEventLog(match));
    }

    return { matchId, playerId, playerIndex };
  }

  createPendingMatch(matchId = randomUUID()): { matchId: string } {
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

    this.matches.set(matchId, match);
    return { matchId };
  }

  listJoinableMatches(): LobbyMatchSummary[] {
    return [...this.matches.values()]
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
    if (match.players[0] === null || match.players[1] === null) {
      return { playerId, playerIndex };
    }

    this.initializeGame(match);
    // Await saveMatch so the match row exists in DB before any action's saveTransactionLogEntry
    // fires — prevents FK constraint violations on transaction_logs.match_id.
    await this.matchRepo.saveMatch(match);
    void this.matchRepo.saveEventLog(matchId, buildMatchEventLog(match));

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

    void this.matchRepo.saveMatch(match);
    void this.matchRepo.saveEventLog(matchId, buildMatchEventLog(match));

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

      void this.matchRepo.saveMatch(match);
      void this.matchRepo.saveEventLog(info.matchId, buildMatchEventLog(match));
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
    for (const [matchId, match] of this.matches) {
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
        this.matches.delete(matchId);
        this.onMatchRemoved?.();
        removed++;
      }
    }
    return removed;
  }

  private initializeGame(match: MatchInstance): void {
    const p0 = match.players[0];
    const p1 = match.players[1];
    if (!p0 || !p1) {
      throw new MatchError('Match is not ready to start', 'MATCH_NOT_READY');
    }
    const rngSeed = match.rngSeed ?? Date.now();
    const config: GameConfig = {
      matchId: match.matchId,
      players: [
        { id: p0.playerId, name: p0.playerName },
        { id: p1.playerId, name: p1.playerName },
      ],
      rngSeed,
      drawTimestamp: new Date().toISOString(),
      gameOptions: match.gameOptions,
      matchParams: match.matchParams ?? DEFAULT_MATCH_PARAMS,
    };
    // createInitialState handles initial 12-card draw and sets phase to StartTurn
    const preInitState = createInitialState(config);
    match.lastPreState = preInitState;

    // Transition to the first action phase via system:init (mode-dependent).
    const initTimestamp = new Date().toISOString();
    match.state = applyAction(
      preInitState,
      {
        type: 'system:init',
        timestamp: initTimestamp,
      },
      {
        hashFn: (s) => computeStateHash(s),
      },
    );
    match.config = config;

    // game.initialized: capture the initial state hash from the system:init entry
    const initEntry = match.state.transactionLog?.at(-1);
    const initialStateHash = initEntry?.stateHashAfter ?? computeStateHash(match.state);
    match.lifecycleEvents.push({
      id: `${match.matchId}:lc:game_initialized`,
      type: 'functional_update',
      name: TelemetryName.EVENT_GAME_INITIALIZED,
      timestamp: initTimestamp,
      payload: { initialStateHash },
      status: 'ok',
    });

    matchLifecycleTotal.add('started');
    if (match.state.phase !== preInitState.phase) {
      recordPhaseTransition(match.matchId, preInitState.phase, match.state.phase);
    }

    this.scheduleBotTurn(match);
  }

  async handleAction(
    matchId: string,
    playerId: string,
    action: Action,
  ): Promise<PhalanxTurnResult> {
    const match = await this.getMatch(matchId);
    if (!match) {
      throw new ActionError(matchId, 'Match not found', 'MATCH_NOT_FOUND');
    }

    this.assertAuthorizedPlayer(match, matchId, playerId, action);
    const serverAction = this.prepareValidatedAction(match, matchId, action);

    // Apply the action with hash and timestamp for transaction log
    match.lastActivityAt = Date.now();

    try {
      const turnResult = await this.applyValidatedAction(match, matchId, playerId, serverAction);

      // Broadcast updated state
      this.broadcastState(match);

      // Schedule bot turn if this is a bot match
      this.scheduleBotTurn(match);

      // Await save so the completed match is in the DB before computing Elo
      await this.matchRepo.saveMatch(match);

      // Persist the event log (fire-and-forget — does not block action response)
      void this.matchRepo.saveEventLog(matchId, buildMatchEventLog(match));

      const postActionState = match.state;
      if (!postActionState) {
        throw new ActionError(matchId, 'Game not initialized', 'GAME_NOT_INIT');
      }

      if (postActionState.phase === 'gameOver') {
        this.maybeEmitGameCompleted(match, matchId);

        // TASK-106: Persist final state hash for durable audit trail
        const finalHash = computeStateHash(postActionState);
        void this.matchRepo.saveFinalStateHash(matchId, finalHash);

        void this.ladderService.onMatchComplete({
          player1Id: match.players[0]?.userId ?? null,
          player2Id: match.players[1]?.userId ?? null,
          botStrategy: match.botStrategy ?? null,
        });
      }

      const lastEntry = postActionState.transactionLog?.at(-1);
      const turnHash =
        lastEntry && match.lastEvents?.length
          ? computeTurnHash(
              lastEntry.stateHashAfter,
              match.lastEvents.map((event) => event.id),
            )
          : undefined;

      return {
        ...turnResult,
        events: match.lastEvents ?? [],
        turnHash,
      };
    } catch (error) {
      this.handleValidatedActionError(match, matchId, serverAction, error);
    }
  }

  private assertAuthorizedPlayer(
    match: MatchInstance,
    matchId: string,
    playerId: string,
    action: Action,
  ): void {
    const player = match.players.find((candidate) => candidate?.playerId === playerId);
    if (!player) {
      throw new ActionError(matchId, 'Player not found in this match', 'PLAYER_NOT_FOUND');
    }

    if ('playerIndex' in action) {
      const actualIndex = match.players.indexOf(player);
      if (action.playerIndex !== actualIndex) {
        throw new ActionError(
          matchId,
          'Player index does not match authenticated identity',
          'UNAUTHORIZED_ACTION',
        );
      }
    }
  }

  private prepareValidatedAction(match: MatchInstance, matchId: string, action: Action): Action {
    if (!match.state) {
      throw new ActionError(matchId, 'Game not initialized', 'GAME_NOT_INIT');
    }

    if (hasUnrecoverableError(match)) {
      throw new ActionError(
        matchId,
        'Match halted after an unrecoverable engine error',
        'MATCH_UNRECOVERABLE_ERROR',
      );
    }

    const serverAction = { ...action, timestamp: new Date().toISOString() };
    const validation = validateAction(match.state, serverAction);
    if (!validation.valid) {
      throw new ActionError(matchId, validation.error ?? 'Invalid action', 'ILLEGAL_ACTION');
    }

    return serverAction;
  }

  private async applyValidatedAction(
    match: MatchInstance,
    matchId: string,
    playerId: string,
    serverAction: Action,
  ): Promise<PhalanxTurnResult> {
    return recordAction(matchId, serverAction, async (): Promise<PhalanxTurnResult> => {
      if (!match.state) throw new ActionError(matchId, 'Game not initialized', 'GAME_NOT_INIT');
      const preState = match.state;
      match.lastPreState = preState;
      const postState = applyAction(preState, serverAction, {
        hashFn: (s) => computeStateHash(s),
      });

      match.state = postState;
      match.actionHistory.push(serverAction);

      const lastEntry = postState.transactionLog?.at(-1);
      match.lastEvents = lastEntry ? deriveEventsFromEntry(lastEntry, matchId) : [];

      if (lastEntry && match.lastEvents.length > 0) {
        lastEntry.turnHash = computeTurnHash(
          lastEntry.stateHashAfter,
          match.lastEvents.map((e) => e.id),
        );
      }

      if (lastEntry) {
        void this.matchRepo.saveTransactionLogEntry(
          matchId,
          lastEntry.sequenceNumber,
          lastEntry,
          match.lastEvents,
        );

        if (lastEntry.action.type === 'system:init') {
          emitOtlpLog(SeverityNumber.INFO, 'INFO', 'Game Initialized', {
            'game.match_id': matchId,
          });
        }
        if (lastEntry.details.type === 'attack') {
          const combat = lastEntry.details.combat;
          emitOtlpLog(
            SeverityNumber.INFO,
            'INFO',
            `Attack: ${combat.attackerCard.face}${combat.attackerCard.suit[0]} deals ${combat.totalLpDamage} LP damage`,
            {
              'game.match_id': matchId,
              'game.turn_number': combat.turnNumber,
            },
          );
        }
      }

      return {
        matchId,
        playerId,
        preState,
        postState,
        action: serverAction,
      };
    });
  }

  private handleValidatedActionError(
    match: MatchInstance,
    matchId: string,
    action: Action,
    error: unknown,
  ): never {
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

    void this.matchRepo.saveEventLog(matchId, buildMatchEventLog(match));

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
