import { randomUUID } from 'node:crypto';
import type { WebSocket } from 'ws';
import type {
  ServerMessage,
  PhalanxTurnResult,
  MatchEventLog,
  GameState,
  Action,
  PhalanxEvent,
  GameOptions,
  MatchParameters,
} from '@phalanxduel/shared';
import {
  DEFAULT_MATCH_PARAMS,
  TelemetryName,
  normalizeCreateMatchParams,
  ServerMessageSchema,
  isGameOver,
} from '@phalanxduel/shared';
import { computeStateHash, computeTurnHash } from '@phalanxduel/shared/hash';
import { deriveEventsFromEntry, computeBotAction } from '@phalanxduel/engine';
import { SeverityNumber } from '@opentelemetry/api-logs';
import { emitOtlpLog } from './instrument.js';
import { MatchRepository } from './db/match-repo.js';
import { MatchActor } from './match-actor.js';
import { type ILedgerStore, PostgresLedgerStore } from './db/ledger-store.js';
import { LadderService } from './ladder.js';
import { matchLifecycleTotal } from './metrics.js';
import { projectGameState, projectTurnResult } from './utils/projection.js';
import { processMatchAchievements } from './achievements/index.js';
import { shadowVerifyOnComplete } from './match-integrity.js';
import type { IEventBus } from './event-bus.js';

import {
  MatchError,
  ActionError,
  type MatchInstance,
  type LobbyMatchSummary,
  type SpectatorMatchSummary,
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
  type SpectatorMatchSummary,
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
const INACTIVITY_FORFEIT_WINDOW_MS = 30 * 60 * 1000;
const PUBLIC_OPEN_MATCH_TTL_MS = 30 * 60 * 1000;
const SYSTEM_ERROR_EVENT_NAME = 'game.system_error';

function send(socket: WebSocket | null, message: ServerMessage): void {
  if (socket?.readyState === 1) {
    const result = ServerMessageSchema.safeParse(message);
    if (!result.success) {
      // Log schema drift but do not drop — game continuity takes priority over strict gating.
      console.error('[send] Outbound message failed schema validation', {
        type: (message as { type?: string }).type,
        issues: result.error.issues,
      });
    }
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
  matches = new Map<string, MatchInstance>();
  private readonly initLocks = new Set<string>();
  socketMap = new Map<WebSocket, SocketInfo>();
  /** Tracks matches currently being loaded from the database to prevent duplicate actor creation */
  private loadingMatchIds = new Map<string, Promise<MatchInstance | null>>();
  /** Tracks pending reconnect timeouts keyed by `matchId:playerId` */
  disconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();
  /** Tracks active-match inactivity timeouts keyed by matchId */
  inactivityTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private inactivityForfeitPlayerIndex = new Map<string, 0 | 1>();
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
    console.log(
      `[MatchManager] Initialized with repo=${this.matchRepo.constructor.name}, ledger=${this.ledgerStore.constructor.name}, bus=${this.eventBus?.constructor.name}`,
    );
  }

  private createMatchRecord(args: {
    matchId: string;
    playerId: string;
    playerName: string;
    creatorIp?: string;
    visibility: 'private' | 'public_open';
    gameOptions?: GameOptions;
    rngSeed?: number;
    userId?: string;
    matchParams: MatchParameters;
  }): MatchInstance {
    const now = Date.now();
    const createdAt = new Date(now).toISOString();
    const {
      matchId,
      playerId,
      playerName,
      creatorIp,
      visibility,
      gameOptions,
      rngSeed,
      userId,
      matchParams,
    } = args;
    return {
      matchId,
      creatorIp,
      visibility,
      publicStatus: visibility === 'public_open' ? 'open' : null,
      publicExpiresAt:
        visibility === 'public_open'
          ? new Date(now + PUBLIC_OPEN_MATCH_TTL_MS).toISOString()
          : null,
      minPublicRating: null,
      maxPublicRating: null,
      minGamesPlayed: null,
      requiresEstablishedRating: false,
      players: [
        {
          playerId,
          playerName,
          playerIndex: 0,
          userId,
          socket: null,
          disconnectedAt: undefined,
        },
        null,
      ],
      spectators: [],
      state: null,
      config: null,
      actionHistory: [],
      gameOptions,
      rngSeed,
      matchParams,
      lastPreState: null,
      lifecycleEvents: [
        {
          id: `${matchId}:lc:match_created`,
          type: 'functional_update',
          name: TelemetryName.EVENT_MATCH_CREATED,
          timestamp: createdAt,
          payload: {
            matchId,
            visibility,
            params: {
              ...matchParams,
              gameOptions: gameOptions ?? null,
            },
            createdAt,
          },
          status: 'ok',
        },
        {
          id: `${matchId}:lc:player_0_joined`,
          type: 'functional_update',
          name: TelemetryName.EVENT_PLAYER_JOINED,
          timestamp: createdAt,
          payload: { playerId, playerIndex: 0, isBot: false, joinedAt: createdAt },
          status: 'ok',
        },
      ],
      fatalEvents: [],
      createdAt: now,
      lastActivityAt: now,
    };
  }

  private async persistJoinedMatch(matchId: string, match: MatchInstance): Promise<void> {
    if (match.players[0] === null || match.players[1] === null || match.state) {
      await this.matchRepo.saveMatch(match);
      if (this.eventBus) {
        await this.eventBus.publishMatchUpdate({
          matchId,
          sequenceNumber: (match.state?.transactionLog ?? []).length - 1,
        });
      }
      return;
    }

    if (this.initLocks.has(matchId)) {
      return;
    }
    this.initLocks.add(matchId);

    await this.matchRepo.saveMatch(match);
    try {
      const actor = this.actors.get(matchId);
      if (actor) {
        const playersToInit = match.players
          .filter((p): p is PlayerConnection => p !== null)
          .map((p) => ({ playerId: p.playerId, playerName: p.playerName }));

        await actor.initializeGame(
          { players: playersToInit, createdAt: match.createdAt },
          async (result) => {
            match.state = result.state;
            match.config = result.config;
            match.lifecycleEvents = result.lifecycleEvents;
            await this.matchRepo.saveMatch(match);
            this.broadcastState(match);
            this.scheduleBotTurn(match);
            this.armInactivityTimer(match);
          },
          this.eventBus,
        );
      }
      await this.matchRepo.saveEventLog(matchId, buildMatchEventLog(match));
    } finally {
      this.initLocks.delete(matchId);
    }
  }

  private async claimPublicOpenSeat(
    matchId: string,
    playerIndex: number,
    playerName: string,
    userId?: string,
  ): Promise<void> {
    if (playerIndex !== 1) return;
    const claimed = await this.matchRepo.claimPublicOpenMatch({
      matchId,
      player2Id: userId ?? null,
      player2Name: playerName,
    });
    if (!claimed) {
      throw new MatchError('Match is no longer open', 'MATCH_FULL');
    }
  }

  async getMatch(matchId: string): Promise<MatchInstance | null> {
    const actor = this.actors.get(matchId);
    if (actor) return this.matches.get(matchId) || null;

    const existingLoading = this.loadingMatchIds.get(matchId);
    if (existingLoading) return existingLoading;

    const loadPromise = (async () => {
      try {
        const dbMatch = await this.matchRepo.getMatch(matchId);
        if (dbMatch) {
          this.armRecoveredReconnectTimers(dbMatch);
          const actor = new MatchActor(matchId, this.ledgerStore, {
            state: dbMatch.state,
            config: dbMatch.config,
            lifecycleEvents: dbMatch.lifecycleEvents,
            fatalEvents: dbMatch.fatalEvents,
          });
          this.actors.set(matchId, actor);
          this.matches.set(matchId, dbMatch);
          await actor.rehydrate();
          if (this.eventBus) {
            await actor.subscribeToUpdates(this.eventBus, () => {
              void this.handleSyncUpdate(matchId);
            });
          }
          this.scheduleBotTurn(dbMatch);
          this.armInactivityTimer(dbMatch);
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

  async createMatch(
    playerName: string,
    socket: WebSocket | null,
    options?: CreateMatchOptions,
  ): Promise<{ matchId: string; playerId: string; playerIndex: number }> {
    const {
      gameOptions,
      rngSeed,
      botOptions,
      matchParams,
      userId,
      creatorIp,
      visibility = 'private',
    } = options ?? {};
    const normalizedMatchParamsResult = normalizeCreateMatchParams(matchParams);

    if (!normalizedMatchParamsResult.success) {
      const detail = normalizedMatchParamsResult.error.issues[0]?.message ?? 'Invalid match params';
      throw new MatchError(`Invalid config: ${detail}`, 'INVALID_MATCH_PARAMS');
    }

    const resolvedMatchParams = normalizedMatchParamsResult.data;

    // Enforce IP-based limit for active matches
    if (creatorIp) {
      const activeFromIp = Array.from(this.matches.values()).filter(
        (m) => m.creatorIp === creatorIp && !(m.state && isGameOver(m.state)),
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
    const match = this.createMatchRecord({
      matchId,
      playerId,
      playerName,
      creatorIp,
      visibility,
      gameOptions,
      rngSeed,
      userId,
      matchParams: resolvedMatchParams,
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

      match.lifecycleEvents.push({
        id: `${matchId}:lc:player_1_joined`,
        type: 'functional_update',
        name: TelemetryName.EVENT_PLAYER_JOINED,
        timestamp: new Date().toISOString(),
        payload: {
          playerId: botPlayerId,
          playerIndex: 1,
          isBot: true,
          joinedAt: new Date().toISOString(),
        },
        status: 'ok',
      });
    }

    const initialPlayers: [{ id: string; name: string }, { id: string; name: string }] = [
      { id: playerId, name: playerName },
      botOptions
        ? {
            id: match.players[1]!.playerId,
            name: match.players[1]!.playerName,
          }
        : { id: 'pending', name: 'Waiting...' },
    ];

    match.config = {
      matchId,
      players: initialPlayers,
      rngSeed: match.rngSeed ?? Date.now(),
      matchParams: match.matchParams ?? DEFAULT_MATCH_PARAMS,
      gameOptions: match.gameOptions,
    };

    const actor = new MatchActor(matchId, this.ledgerStore, {
      state: match.state,
      config: match.config,
      lifecycleEvents: match.lifecycleEvents,
      fatalEvents: match.fatalEvents,
    });
    this.actors.set(matchId, actor);
    this.matches.set(matchId, match);

    if (socket) {
      match.players[0]!.socket = socket;
      this.socketMap.set(socket, { matchId, playerId, isSpectator: false });
    }

    matchLifecycleTotal.add('started');

    // CRITICAL: Ensure the match record exists in the DB before any ledger actions are written.
    // This prevents foreign key violations in Postgres when MatchActor initializes the game.
    await this.matchRepo.saveMatch(match);

    if (visibility === 'public_open' && userId) {
      void this.matchRepo.incrementMatchesCreated(userId);
    }

    if (this.eventBus) {
      await actor.subscribeToUpdates(this.eventBus, () => {
        void this.handleSyncUpdate(matchId);
      });
    }

    // For bot matches, initialize the game immediately
    if (botOptions) {
      if (!this.initLocks.has(matchId)) {
        this.initLocks.add(matchId);
        try {
          const playersToInit = match.players
            .filter((p): p is PlayerConnection => p !== null)
            .map((p) => ({ playerId: p.playerId, playerName: p.playerName }));

          await actor.initializeGame(
            { players: playersToInit, createdAt: match.createdAt },
            async (result) => {
              match.state = result.state;
              match.config = result.config;
              match.lifecycleEvents = result.lifecycleEvents;
              await this.matchRepo.saveMatch(match);
              this.broadcastState(match);
              this.scheduleBotTurn(match);
              this.armInactivityTimer(match);
            },
            this.eventBus,
          );
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
      visibility: 'public_open',
      publicStatus: 'open',
      publicExpiresAt: null,
      minPublicRating: null,
      maxPublicRating: null,
      minGamesPlayed: null,
      requiresEstablishedRating: false,
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

    const actor = new MatchActor(matchId, this.ledgerStore, {
      state: match.state,
      config: match.config,
      lifecycleEvents: match.lifecycleEvents,
      fatalEvents: match.fatalEvents,
    });
    this.actors.set(matchId, actor);
    this.matches.set(matchId, match);

    if (this.eventBus) {
      await actor.subscribeToUpdates(this.eventBus, () => {
        void this.handleSyncUpdate(matchId);
      });
    }

    await this.matchRepo.saveMatch(match);
    return { matchId };
  }

  listJoinableMatches(): LobbyMatchSummary[] {
    return [...this.matches.values()]
      .filter((match) => match.visibility === 'public_open')
      .filter((match) => match.publicStatus === 'open')
      .filter((match) => !(match.state && isGameOver(match.state)))
      .filter((match) => match.players[0] === null || match.players[1] === null)
      .map((match) => {
        const openSeat: LobbyMatchSummary['openSeat'] = match.players[0] === null ? 'P0' : 'P1';
        return {
          matchId: match.matchId,
          visibility: match.visibility ?? 'private',
          publicStatus: match.publicStatus ?? null,
          creatorUserId: match.players[0]?.userId ?? null,
          creatorName: match.players[0]?.playerName ?? 'Waiting...',
          creatorElo: null,
          creatorRecord: null,
          requirements: {
            minPublicRating: match.minPublicRating ?? null,
            maxPublicRating: match.maxPublicRating ?? null,
            minGamesPlayed: match.minGamesPlayed ?? null,
            requiresEstablishedRating: Boolean(match.requiresEstablishedRating),
          },
          joinable: true,
          disabledReason: null,
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
          publicExpiresAt: match.publicExpiresAt ? Date.parse(match.publicExpiresAt) : null,
        };
      })
      .sort((a, b) => b.lastActivityAt - a.lastActivityAt);
  }

  /**
   * Refreshes match metadata from the persistence layer and broadcasts the
   * latest state to all connected local clients. This is triggered by cluster
   * notifications via Postgres LISTEN/NOTIFY.
   */
  private async handleSyncUpdate(matchId: string): Promise<void> {
    const actor = this.actors.get(matchId);
    const match = this.matches.get(matchId);
    if (!actor || !match) return;

    try {
      const updated = await this.matchRepo.getMatch(matchId);
      if (updated) {
        // Sync metadata from DB (Actor only syncs Ledger)
        match.players = updated.players.map((p, idx) => {
          const existing = match.players[idx];
          // If DB has a player, merge with existing socket if applicable
          if (p) {
            const mergedPlayer =
              existing?.userId && !p.userId ? { ...p, userId: existing.userId } : p;
            // Priority for playerId: Trust the DB (the authoritative source) above all.
            // If we have a local socket for this slot, preserve it.
            if (existing?.socket) {
              return { ...mergedPlayer, socket: existing.socket };
            }
            return mergedPlayer;
          }
          // If DB has NO player, but we HAVE one locally, keep local (it hasn't persisted yet)
          // This avoids the race where Bob joins but Alice's notification wipes him.
          if (existing) {
            return existing;
          }
          return null;
        }) as [PlayerConnection | null, PlayerConnection | null];
        match.config = updated.config;
        match.botConfig = updated.botConfig;
        match.botPlayerIndex = updated.botPlayerIndex;
        match.botStrategy = updated.botStrategy;
        match.visibility = updated.visibility;
        match.publicStatus = updated.publicStatus;
        match.publicExpiresAt = updated.publicExpiresAt;
        match.minPublicRating = updated.minPublicRating;
        match.maxPublicRating = updated.maxPublicRating;
        match.minGamesPlayed = updated.minGamesPlayed;
        match.requiresEstablishedRating = updated.requiresEstablishedRating;
        match.lastActivityAt = updated.lastActivityAt;

        // Fallback: If ledger catch-up hasn't populated state yet, use the snapshot from the matches table.
        if (!actor.state && updated.state) {
          match.state = updated.state;
        } else {
          match.state = actor.state;
        }
        match.lastEvents = actor.lastEvents;
        match.lastPreState = actor.lastPreState;
        match.lifecycleEvents = actor.lifecycleEvents;
        match.fatalEvents = actor.fatalEvents;
      }
      this.broadcastState(match);
      this.armInactivityTimer(match);
    } catch (err) {
      console.error(`[MatchManager] Failed to handle sync update for ${matchId}:`, err);
    }
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
    if (
      match.visibility === 'public_open' &&
      match.players[0]?.userId &&
      userId &&
      match.players[0].userId === userId
    ) {
      throw new MatchError('Creator cannot join own public match', 'MATCH_SELF_JOIN');
    }

    const playerId = randomUUID();
    const playerIndex = match.players[0] === null ? 0 : 1;

    if (match.visibility === 'public_open') {
      await this.claimPublicOpenSeat(matchId, playerIndex, playerName, userId);
    }

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
    if (match.visibility === 'public_open' && playerIndex === 1) {
      match.publicStatus = 'claimed';
      match.publicExpiresAt = null;
    }

    // CRITICAL: Update config.players immediately. This prevents a race where handleSyncUpdate
    // reloads 'pending' from the DB before actor.initializeGame completes its authoritative update.
    if (match.config?.players) {
      match.config.players[playerIndex] = { id: playerId, name: playerName };
    }
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

    await this.persistJoinedMatch(matchId, match);

    if (match.visibility === 'public_open' && playerIndex === 1) {
      const creatorUserId = match.players[0]?.userId;
      if (creatorUserId) {
        void this.matchRepo.incrementSuccessfulStarts(creatorUserId);
      }
    }

    // Note: caller is responsible for sending matchJoined before calling broadcastState
    return { playerId, playerIndex };
  }

  async rejoinMatch(
    matchId: string,
    playerId: string,
    socket: WebSocket,
    userId?: string,
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

    if (player.userId && player.userId !== userId) {
      throw new MatchError('Identity mismatch', 'IDENTITY_MISMATCH');
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
      if (match.state && !isGameOver(match.state)) {
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
    if (!match?.state || isGameOver(match.state)) return;

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
    if (!match.state || isGameOver(match.state)) return;

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

  private clearInactivityTimer(matchId: string): void {
    const timer = this.inactivityTimers.get(matchId);
    if (timer) {
      clearTimeout(timer);
      this.inactivityTimers.delete(matchId);
    }
  }

  private armInactivityTimer(match: MatchInstance): void {
    this.clearInactivityTimer(match.matchId);
    if (!match.state || isGameOver(match.state)) return;
    if (!match.players[0] || !match.players[1]) return;

    const activePlayerIndex = match.state.activePlayerIndex;
    if (activePlayerIndex !== 0 && activePlayerIndex !== 1) return;
    const inactivePlayer = match.players[activePlayerIndex];
    if (!inactivePlayer) return;
    if (match.botPlayerIndex === activePlayerIndex) return;

    const elapsedMs = Date.now() - match.lastActivityAt;
    const remainingMs = Math.max(0, INACTIVITY_FORFEIT_WINDOW_MS - elapsedMs);
    const armedAt = match.lastActivityAt;
    const timer = setTimeout(() => {
      this.inactivityTimers.delete(match.matchId);
      void this.forfeitInactivePlayer(
        match.matchId,
        activePlayerIndex,
        inactivePlayer.playerId,
        armedAt,
      );
    }, remainingMs);
    this.inactivityTimers.set(match.matchId, timer);
  }

  private async forfeitInactivePlayer(
    matchId: string,
    playerIndex: 0 | 1,
    playerId: string,
    armedAt: number,
  ): Promise<void> {
    const match = await this.getMatch(matchId);
    if (!match?.state || isGameOver(match.state)) return;
    if (!match.players[0] || !match.players[1]) return;
    if (match.lastActivityAt !== armedAt) {
      this.armInactivityTimer(match);
      return;
    }
    if (match.state.activePlayerIndex !== playerIndex) {
      this.armInactivityTimer(match);
      return;
    }

    try {
      this.inactivityForfeitPlayerIndex.set(matchId, playerIndex);
      await this.handleAction(matchId, playerId, {
        type: 'forfeit',
        playerIndex,
        timestamp: new Date().toISOString(),
      });
    } catch {
      // Match may have ended or changed while the timer callback was running.
    } finally {
      this.inactivityForfeitPlayerIndex.delete(matchId);
    }
  }

  /** Remove stale matches: gameOver after 5 min, abandoned after 10 min */
  cleanupMatches(): number {
    const now = Date.now();
    let removed = 0;
    for (const [matchId, match] of this.matches) {
      if (
        match.visibility === 'public_open' &&
        match.publicStatus === 'open' &&
        now - match.createdAt > PUBLIC_OPEN_MATCH_TTL_MS
      ) {
        match.publicStatus = 'expired';
        match.publicExpiresAt = new Date(match.createdAt + PUBLIC_OPEN_MATCH_TTL_MS).toISOString();
        void this.matchRepo.saveMatch(match);
        this.clearInactivityTimer(matchId);
        this.matches.delete(matchId);
        this.actors.delete(matchId);
        this.onMatchRemoved?.();
        removed++;
        continue;
      }
      const matchIsOver = match.state != null && isGameOver(match.state);
      const elapsed = now - match.lastActivityAt;
      if ((matchIsOver && elapsed > GAME_OVER_TTL) || elapsed > ABANDONED_TTL) {
        if (!matchIsOver) {
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
        this.clearInactivityTimer(matchId);
        this.matches.delete(matchId);
        this.onMatchRemoved?.();
        removed++;
      }
    }
    return removed;
  }

  async cancelMatch(matchId: string, userId: string): Promise<boolean> {
    const cancelled = await this.matchRepo.cancelPendingMatch(matchId, userId);
    if (cancelled) {
      this.actors.delete(matchId);
      this.clearInactivityTimer(matchId);
      this.matches.delete(matchId);
    }
    return cancelled;
  }

  async terminateMatch(matchId: string): Promise<boolean> {
    const terminated = await this.matchRepo.forceTerminateMatch(matchId);
    if (terminated) {
      const match = this.matches.get(matchId);
      if (match) {
        for (const player of match.players) {
          if (player?.socket) this.socketMap.delete(player.socket);
        }
        for (const spectator of match.spectators) {
          if (spectator.socket) this.socketMap.delete(spectator.socket);
        }
      }
      this.actors.delete(matchId);
      this.clearInactivityTimer(matchId);
      this.matches.delete(matchId);
      this.onMatchRemoved?.();
    }
    return terminated;
  }

  listInMemoryMatches(): MatchInstance[] {
    return Array.from(this.matches.values());
  }

  getSocketInfo(socket: WebSocket): SocketInfo | undefined {
    return this.socketMap.get(socket);
  }

  broadcastToAll(message: ServerMessage): void {
    for (const socket of this.socketMap.keys()) {
      send(socket, message);
    }
  }

  async handleAction(
    matchId: string,
    playerId: string,
    action: Action,
  ): Promise<PhalanxTurnResult> {
    const actor = this.actors.get(matchId);
    const match = this.matches.get(matchId);
    if (!actor || !match) {
      throw new ActionError(matchId, 'Match not found', 'MATCH_NOT_FOUND');
    }

    this.clearInactivityTimer(matchId);
    match.lastActivityAt = Date.now();

    const authorizedPlayers = match.players
      .filter((p): p is PlayerConnection => p !== null)
      .map((p) => ({ playerId: p.playerId, playerIndex: p.playerIndex }));

    return actor.dispatchAction(playerId, action, authorizedPlayers, {
      onSuccess: async (result) => {
        match.state = result.postState;
        match.lastEvents = result.events;
        match.lastPreState = result.preState;
        match.actionHistory.push(result.action);
        match.lastActivityAt = Date.now();

        if (match.state && isGameOver(match.state)) {
          this.maybeEmitGameCompleted(match, matchId);
        }

        this.broadcastState(match);
        this.scheduleBotTurn(match);
        this.armInactivityTimer(match);
        await this.matchRepo.saveMatch(match);
        await this.matchRepo.saveEventLog(matchId, buildMatchEventLog(match));

        if (match.state && isGameOver(match.state)) {
          const finalHash = computeStateHash(match.state);
          await this.matchRepo.saveFinalStateHash(matchId, finalHash);
          shadowVerifyOnComplete(matchId, this.matchRepo);

          await this.ladderService.onMatchComplete({
            matchId,
            player1Id: match.players[0]?.userId ?? null,
            player2Id: match.players[1]?.userId ?? null,
            botStrategy: match.botStrategy ?? null,
            outcome: match.state?.outcome ?? null,
            abandonPlayerIndex: this.inactivityForfeitPlayerIndex.get(matchId) ?? null,
          });

          await processMatchAchievements({
            matchId,
            finalState: match.state,
            playerUserIds: [match.players[0]?.userId ?? null, match.players[1]?.userId ?? null],
          });
        }
      },
      onError: async (err) => {
        this.armInactivityTimer(match);
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
    if (isGameOver(match.state)) return;

    if (match.botPlayerIndex == null) return;
    const botIdx = match.botPlayerIndex;
    if (match.state.activePlayerIndex !== botIdx) return;

    const botPlayer = match.players[botIdx];
    if (!botPlayer) return;

    setTimeout(() => {
      if (!match.state || isGameOver(match.state)) return;
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
    const actor = this.actors.get(match.matchId);
    const events = match.lastEvents ?? actor?.lastEvents ?? [];

    const turnHash =
      lastEntry && events.length
        ? computeTurnHash(
            lastEntry.stateHashAfter,
            events.map((e) => e.id),
          )
        : undefined;

    const preStateSource = match.lastPreState ?? match.state;

    for (const player of match.players) {
      if (player?.socket) {
        console.log(
          `[WS-DEBUG] Broadcasting ${lastAction.type} to player ${player.playerIndex} (socket readyState: ${player.socket.readyState})`,
        );
        const viewModel = projectTurnResult({
          matchId: match.matchId,
          preState: preStateSource,
          postState: match.state,
          action: lastAction,
          events,
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
            events,
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
          events,
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
            events,
            turnHash,
          },

          viewModel, // Phase 1: Add new ViewModel to existing message
          spectatorCount,
        });
      }
    }
  }
}
