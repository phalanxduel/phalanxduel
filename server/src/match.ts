import { randomUUID } from 'node:crypto';
import type { WebSocket } from 'ws';
import type {
  GameState,
  Action,
  ServerMessage,
  GameOptions,
  PlayerState,
  CreateMatchParamsPartial,
  PhalanxTurnResult,
  PhalanxEvent,
  MatchEventLog,
  Battlefield,
  TransactionLogEntry,
} from '@phalanxduel/shared';
import { DEFAULT_MATCH_PARAMS, TelemetryName } from '@phalanxduel/shared';
import { computeStateHash, computeTurnHash } from '@phalanxduel/shared/hash';
import {
  createInitialState,
  applyAction,
  computeBotAction,
  deriveEventsFromEntry,
  type BotConfig,
} from '@phalanxduel/engine';
import type { GameConfig } from '@phalanxduel/engine';
import { GameTelemetry } from './telemetry.js';
import type { IStateStore, IEventBus } from './db/state-interfaces.js';
import * as Sentry from '@sentry/node';
import { MatchRepository } from './db/match-repo.js';
import { LadderService } from './ladder.js';
import { matchLifecycleTotal } from './metrics.js';

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

export interface PlayerConnection {
  playerId: string;
  playerName: string;
  playerIndex: number;
  userId?: string;
}

interface SpectatorConnection {
  spectatorId: string;
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
  matchParams?: CreateMatchParamsPartial;
  botConfig?: BotConfig;
  botPlayerIndex?: 0 | 1;
  botStrategy?: 'random' | 'heuristic';
  lastEvents?: PhalanxEvent[];
  lastPreState: GameState | null;
  lifecycleEvents: PhalanxEvent[];
  createdAt: number;
  lastActivityAt: number;
}

const MAX_ACTIVE_MATCHES_PER_IP = 3;
const MAX_SPECTATORS_PER_MATCH = 50;

function resolveMatchParams(
  matchParams?: CreateMatchParamsPartial,
): NonNullable<GameConfig['matchParams']> {
  const rows = matchParams?.rows ?? DEFAULT_MATCH_PARAMS.rows;
  const columns = matchParams?.columns ?? DEFAULT_MATCH_PARAMS.columns;

  // RULES.md § 3.3: Total slots cannot exceed 48
  if (rows * columns > 48) {
    throw new MatchError(
      `Invalid config: total slots (${rows * columns}) cannot exceed 48`,
      'INVALID_MATCH_PARAMS',
    );
  }

  // RULES.md § 3.3: maxHandSize cannot exceed columns
  const defaultMaxHandSize = Math.min(DEFAULT_MATCH_PARAMS.maxHandSize, columns);
  if (matchParams?.maxHandSize !== undefined && matchParams.maxHandSize > columns) {
    throw new MatchError(
      `Invalid config: maxHandSize (${matchParams.maxHandSize}) cannot exceed columns (${columns})`,
      'INVALID_MATCH_PARAMS',
    );
  }
  const maxHandSize = matchParams?.maxHandSize ?? defaultMaxHandSize;

  // RULES.md § 3.3: initialDraw = rows * columns + columns
  const expectedInitialDraw = rows * columns + columns;
  if (matchParams?.initialDraw !== undefined && matchParams.initialDraw !== expectedInitialDraw) {
    throw new MatchError(
      `Invalid config: initialDraw must equal rows * columns + columns (${expectedInitialDraw})`,
      'INVALID_MATCH_PARAMS',
    );
  }
  const initialDraw = expectedInitialDraw;

  return { rows, columns, maxHandSize, initialDraw };
}

function send(socket: WebSocket | null, message: ServerMessage): void {
  if (socket?.readyState === 1) {
    socket.send(JSON.stringify(message));
  }
}

function redactBattlefield(battlefield: Battlefield): Battlefield {
  return battlefield.map((cell) => {
    if (!cell?.faceDown) return cell;
    // Redact card details when face-down
    return {
      ...cell,
      card: {
        id: cell.card.id, // ID is needed for sync/referencing
        suit: 'spades', // Placeholder
        face: '?', // Hidden
        value: 0, // Hidden
        type: 'number', // Placeholder
      },
    };
  });
}

function redactHiddenCards(playerState: PlayerState): PlayerState {
  const { hand, drawpile, battlefield, discardPile, ...rest } = playerState;
  return {
    ...rest,
    battlefield: redactBattlefield(battlefield),
    hand: [],
    drawpile: [],
    // Show only the top card of the discard pile if it exists
    discardPile: discardPile.length > 0 ? [discardPile[discardPile.length - 1]!] : [],
    handCount: hand.length,
    drawpileCount: drawpile.length,
    discardPileCount: discardPile.length,
  };
}

function redactPhalanxEvents(events: PhalanxEvent[]): PhalanxEvent[] {
  return events.map((ev) => {
    const payload = { ...ev.payload };

    // Redact card details in combat steps
    if (ev.name === TelemetryName.EVENT_COMBAT_STEP && payload.card) {
      const card = payload.card as Record<string, unknown>;
      // Redact if not a functional update or if face-down (Fog of War)
      // Actually, in the event log, we generally redact all card details for public view
      // except for the ID (needed for continuity).
      payload.card = {
        id: card.id,
        suit: 'spades',
        face: '?',
        value: 0,
        type: 'number',
      };
    }

    // Redact cardIds in deploy/reinforce
    if (
      (ev.name === TelemetryName.EVENT_DEPLOY || ev.name === TelemetryName.EVENT_REINFORCE) &&
      payload.cardId
    ) {
      payload.cardId = 'hidden';
    }

    return { ...ev, payload };
  });
}

/** Redact card details in event log for public/spectator view */
export function filterEventLogForPublic(log: MatchEventLog): MatchEventLog {
  const events = redactPhalanxEvents(log.events);
  const fingerprint = computeStateHash(events);
  return {
    ...log,
    events,
    fingerprint,
  };
}

/**
 * Builds the unified MatchEventLog for a match: lifecycle events prepended to
 * all turn-derived events in sequence order, with a SHA-256 fingerprint.
 */
export function buildMatchEventLog(match: MatchInstance): MatchEventLog {
  const turnEvents: PhalanxEvent[] = (match.state?.transactionLog ?? []).flatMap((entry) =>
    deriveEventsFromEntry(entry, match.matchId),
  );
  const events = [...match.lifecycleEvents, ...turnEvents];
  const fingerprint = computeStateHash(events);
  return {
    matchId: match.matchId,
    events,
    fingerprint,
    generatedAt: new Date().toISOString(),
  };
}

function redactTransactionLog(
  log: TransactionLogEntry[] | undefined,
): TransactionLogEntry[] | undefined {
  if (!log) return undefined;
  return log.map((entry) => {
    // Redact cardId from deploy/reinforce actions
    const action = { ...entry.action };
    if (action.type === 'deploy' || action.type === 'reinforce') {
      action.cardId = 'hidden';
    }

    // Redact CombatLogEntry details
    const details = { ...entry.details };
    if (details.type === 'attack') {
      details.combat = {
        ...details.combat,
        attackerCard: {
          ...details.combat.attackerCard,
          face: '?',
          value: 0,
          suit: 'spades',
        },
        steps: details.combat.steps.map((step) => ({
          ...step,
          card: step.card
            ? {
                ...step.card,
                face: '?',
                value: 0,
                suit: 'spades',
              }
            : undefined,
        })),
      };
    }

    return {
      ...entry,
      action,
      details,
    };
  });
}

/** Redact both players' hands/drawpiles for spectator view */
export function filterStateForSpectator(state: GameState): GameState {
  const players = state.players.map((ps) => redactHiddenCards(ps));
  return {
    ...state,
    players: [players[0]!, players[1]!],
    transactionLog: redactTransactionLog(state.transactionLog),
  };
}

/** Redact opponent hand/drawpile/discard, replace with counts */
export function filterStateForPlayer(state: GameState, playerIndex: number): GameState {
  const players = state.players.map((ps, idx) => {
    if (idx === playerIndex) {
      // Current player sees their own full discard pile
      return {
        ...ps,
        discardPileCount: ps.discardPile.length,
      };
    }
    return redactHiddenCards(ps);
  });
  return {
    ...state,
    players: [players[0]!, players[1]!],
    transactionLog: redactTransactionLog(state.transactionLog),
  };
}

/** TTL constants in milliseconds */
const GAME_OVER_TTL = 5 * 60 * 1000; // 5 minutes
const ABANDONED_TTL = 10 * 60 * 1000; // 10 minutes

export class MatchManager {
  socketMap = new Map<WebSocket, SocketInfo>();
  onMatchRemoved: (() => void) | null = null;
  private matchRepo = new MatchRepository();
  private ladderService = new LadderService();

  constructor(
    public readonly stateStore: IStateStore,
    private readonly eventBus: IEventBus,
  ) {
    this.eventBus.subscribeToAllStateUpdates((match) => {
      this.broadcastLocalState(match);
    });
  }

  async getMatch(matchId: string): Promise<MatchInstance | null> {
    const match = await this.stateStore.getMatch(matchId);
    if (match) return match;

    const dbMatch = await this.matchRepo.getMatch(matchId);
    if (dbMatch) {
      await this.stateStore.saveMatch(dbMatch);
      return dbMatch;
    }

    return null;
  }

  broadcastMatchState(matchId: string): void {
    void (async () => {
      const match = await this.getMatch(matchId);
      if (match) {
        await this.eventBus.publishStateUpdate(match.matchId, match);
      }
    })();
  }

  async createMatch(
    playerName: string,
    socket: WebSocket | null,
    options?: CreateMatchOptions,
  ): Promise<{ matchId: string; playerId: string; playerIndex: number }> {
    const { gameOptions, rngSeed, botOptions, matchParams, userId, creatorIp } = options ?? {};

    // Enforce IP-based limit for active matches
    if (creatorIp) {
      const activeMatches = await this.stateStore.getActiveMatches();
      const activeFromIp = activeMatches.filter(
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
      matchParams,
      lastPreState: null,
      lifecycleEvents: [],
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
          rows: matchParams?.rows ?? DEFAULT_MATCH_PARAMS.rows,
          columns: matchParams?.columns ?? DEFAULT_MATCH_PARAMS.columns,
          maxHandSize: matchParams?.maxHandSize ?? DEFAULT_MATCH_PARAMS.maxHandSize,
          initialDraw: matchParams?.initialDraw ?? DEFAULT_MATCH_PARAMS.initialDraw,
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

    // For bot matches, initialize the game immediately
    if (botOptions) {
      this.initializeGame(match);
    }

    void this.stateStore.saveMatch(match);

    if (socket) {
      this.socketMap.set(socket, { matchId, playerId, isSpectator: false });
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

    void this.stateStore.saveMatch(match);
    return { matchId };
  }

  async joinMatch(
    matchId: string,
    playerName: string,
    socket: WebSocket,
    userId?: string,
  ): Promise<{ playerId: string; playerIndex: number }> {
    return await this.stateStore.lockMatch(matchId, async (match) => {
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
      };

      match.players[playerIndex] = player;
      match.lastActivityAt = Date.now();
      this.socketMap.set(socket, { matchId, playerId, isSpectator: false });

      const joinedAt = new Date().toISOString();
      match.lifecycleEvents.push({
        id: `${matchId}:lc:player_${playerIndex}_joined`,
        type: 'functional_update',
        name: TelemetryName.EVENT_PLAYER_JOINED,
        timestamp: joinedAt,
        payload: { playerId, playerIndex, isBot: false, joinedAt },
        status: 'ok',
      });

      if (match.players[0] !== null && match.players[1] !== null) {
        this.initializeGame(match);
      }

      await this.matchRepo.saveMatch(match);

      // Note: caller is responsible for sending matchJoined before calling broadcastState
      return { playerId, playerIndex };
    });
  }

  async watchMatch(matchId: string, socket: WebSocket): Promise<{ spectatorId: string }> {
    return await this.stateStore.lockMatch(matchId, async (match) => {
      if (match.spectators.length >= MAX_SPECTATORS_PER_MATCH) {
        throw new MatchError(
          `Too many spectators for this match (max ${MAX_SPECTATORS_PER_MATCH})`,
          'SPECTATOR_LIMIT_REACHED',
        );
      }

      const spectatorId = randomUUID();
      const spectator: SpectatorConnection = { spectatorId };

      match.spectators.push(spectator);
      match.lastActivityAt = Date.now();
      this.socketMap.set(socket, { matchId, spectatorId, isSpectator: true });

      const joinedAt = new Date().toISOString();
      match.lifecycleEvents.push({
        id: `${matchId}:lc:spectator_${spectatorId}_joined`,
        type: 'functional_update',
        name: TelemetryName.EVENT_SPECTATOR_JOINED,
        timestamp: joinedAt,
        payload: { spectatorId, joinedAt },
        status: 'ok',
      });

      return { spectatorId };
    });
  }

  updatePlayerIdentity(socket: WebSocket, userId: string, playerName: string): void {
    void (async () => {
      const info = this.socketMap.get(socket);
      if (!info || info.isSpectator) return;

      await this.stateStore.lockMatch(info.matchId, async (lockedMatch) => {
        const p = lockedMatch.players.find((x) => x?.playerId === info.playerId);
        if (p) {
          p.userId = userId;
          p.playerName = playerName;
        }
      });
    })();
  }

  handleDisconnect(socket: WebSocket): void {
    void (async () => {
      const info = this.socketMap.get(socket);
      if (!info) return;

      this.socketMap.delete(socket);
      const match = await this.getMatch(info.matchId);
      if (!match) return;

      if (info.isSpectator) {
        // Just removed from socketMap locally
        return;
      }

      // Notify opponent locally if they are on this node
      const opponent = match.players.find((p) => p !== null && p.playerId !== info.playerId);
      if (opponent) {
        for (const [s, sInfo] of this.socketMap.entries()) {
          if (
            sInfo.matchId === info.matchId &&
            !sInfo.isSpectator &&
            sInfo.playerId === opponent.playerId
          ) {
            send(s, { type: 'opponentDisconnected', matchId: info.matchId });
          }
        }
      }
    })();
  }

  /** Remove stale matches: gameOver after 5 min, abandoned after 10 min */
  async cleanupMatches(): Promise<number> {
    const now = Date.now();
    let removed = 0;
    const activeMatches = await this.stateStore.getActiveMatches();
    for (const match of activeMatches) {
      const isGameOver = match.state?.phase === 'gameOver';
      const elapsed = now - match.lastActivityAt;
      if ((isGameOver && elapsed > GAME_OVER_TTL) || elapsed > ABANDONED_TTL) {
        if (!isGameOver) {
          matchLifecycleTotal.add('abandoned');
        }

        await this.stateStore.removeMatch(match.matchId);
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
    const resolvedMatchParams = resolveMatchParams(match.matchParams);
    const config: GameConfig = {
      matchId: match.matchId,
      players: [
        { id: p0.playerId, name: p0.playerName },
        { id: p1.playerId, name: p1.playerName },
      ],
      rngSeed,
      drawTimestamp: new Date().toISOString(),
      gameOptions: match.gameOptions,
      matchParams: resolvedMatchParams,
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
      GameTelemetry.recordPhaseTransition(match.matchId, preInitState.phase, match.state.phase);
    }

    this.scheduleBotTurn(match);
  }

  async handleAction(matchId: string, playerId: string, action: Action): Promise<void> {
    await this.stateStore.lockMatch(matchId, async (match) => {
      const player = match.players.find((p) => p?.playerId === playerId);
      if (!player) {
        throw new ActionError(matchId, 'Player not found in this match', 'PLAYER_NOT_FOUND');
      }

      if (!match.state) {
        throw new ActionError(matchId, 'Game not initialized', 'GAME_NOT_INIT');
      }

      // Apply the action with hash and timestamp for transaction log
      match.lastActivityAt = Date.now();

      await GameTelemetry.recordAction(matchId, action, async (): Promise<PhalanxTurnResult> => {
        const preState = match.state!;
        match.lastPreState = preState;
        // Normalize to server timestamp before applying so the stored action and the
        // applyAction call use the same timestamp — replay reads action.timestamp and
        // must match the timestamp used for card ID generation during the live game.
        const serverAction = { ...action, timestamp: new Date().toISOString() };
        const postState = applyAction(preState, serverAction, {
          hashFn: (s) => computeStateHash(s),
        });

        match.state = postState;
        match.actionHistory.push(serverAction);

        // Derive events from the latest transaction log entry
        const lastEntry = postState.transactionLog?.at(-1);
        match.lastEvents = lastEntry ? deriveEventsFromEntry(lastEntry, matchId) : [];

        // Persist the canonical turn digest on the log entry (RULES.md §20.2)
        if (lastEntry && match.lastEvents.length > 0) {
          lastEntry.turnHash = computeTurnHash(
            lastEntry.stateHashAfter,
            match.lastEvents.map((e) => e.id),
          );
        }

        if (lastEntry) {
          // Per-action audit persistence (TASK-24)
          void this.matchRepo.saveTransactionLogEntry(
            matchId,
            lastEntry.sequenceNumber,
            lastEntry,
            match.lastEvents,
          );

          if (lastEntry.action.type === 'system:init') {
            Sentry.addBreadcrumb({
              category: 'game.system',
              message: 'Game Initialized',
              data: { matchId },
            });
          }
          if (lastEntry.details.type === 'attack' && lastEntry.details.combat) {
            const combat = lastEntry.details.combat;
            Sentry.addBreadcrumb({
              category: 'game.combat',
              message: `Attack: ${combat.attackerCard.face}${combat.attackerCard.suit[0]} deals ${combat.totalLpDamage} LP damage`,
              data: { matchId, turn: combat.turnNumber },
            });
          }
        }

        return {
          matchId,
          playerId,
          preState,
          postState,
          action,
        };
      });

      if (match.state?.phase === 'gameOver') {
        this.maybeEmitGameCompleted(match, matchId);
      }

      // Await save so the completed match is in the DB before computing Elo
      // Note: stateStore.lockMatch automatically saves the match after the callback.
      await this.matchRepo.saveMatch(match);

      // Publish updated state to cluster
      await this.eventBus.publishStateUpdate(match.matchId, match);

      // Schedule bot turn if this is a bot match
      this.scheduleBotTurn(match);

      // Persist the event log (fire-and-forget — does not block action response)
      void this.matchRepo.saveEventLog(matchId, buildMatchEventLog(match));

      if (match.state?.phase === 'gameOver') {
        void this.ladderService.onMatchComplete({
          player1Id: match.players[0]?.userId ?? null,
          player2Id: match.players[1]?.userId ?? null,
          botStrategy: match.botStrategy ?? null,
        });
      }
    });
  }

  /** Emits game.completed once when the match first reaches gameOver. */
  private maybeEmitGameCompleted(match: MatchInstance, matchId: string): void {
    const alreadyCompleted = match.lifecycleEvents.some(
      (e) => e.name === TelemetryName.EVENT_GAME_COMPLETED,
    );
    if (alreadyCompleted) return;

    const completedAt = new Date().toISOString();
    const outcome = match.state!.outcome;
    match.lifecycleEvents.push({
      id: `${matchId}:lc:game_completed`,
      type: 'functional_update',
      name: TelemetryName.EVENT_GAME_COMPLETED,
      timestamp: completedAt,
      payload: {
        winnerIndex: outcome?.winnerIndex ?? null,
        victoryType: outcome?.victoryType ?? null,
        turnNumber: outcome?.turnNumber ?? match.state!.turnNumber,
        finalLp: [
          match.state!.players[0]?.lifepoints ?? 0,
          match.state!.players[1]?.lifepoints ?? 0,
        ],
        durationMs: Date.now() - match.createdAt,
      },
      status: 'ok',
    });
  }

  private scheduleBotTurn(match: MatchInstance): void {
    if (!match.botConfig || !match.state) return;
    if (match.state.phase === 'gameOver') return;

    const botIdx = match.botPlayerIndex!;
    if (match.state.activePlayerIndex !== botIdx) return;

    const botPlayer = match.players[botIdx];
    if (!botPlayer) return;

    setTimeout(async () => {
      if (!match.state || match.state.phase === 'gameOver') return;
      if (match.state.activePlayerIndex !== botIdx) return;

      const turnSeed = match.botConfig!.seed + match.state.turnNumber;
      const action = computeBotAction(match.state, botIdx, {
        ...match.botConfig!,
        seed: turnSeed,
      });

      try {
        await this.handleAction(match.matchId, botPlayer.playerId, action);
      } catch {
        // Bot generated invalid action — handleAction already logs via telemetry
      }
      // handleAction calls broadcastState and scheduleBotTurn, so no recursion needed
    }, 300);
  }

  broadcastLocalState(match: MatchInstance): void {
    if (!match.state) return;
    const spectatorCount = match.spectators.length;
    const lastAction = match.actionHistory[match.actionHistory.length - 1] ?? {
      type: 'system:init',
      timestamp: new Date().toISOString(),
    };
    const lastEntry = match.state?.transactionLog?.at(-1);
    const turnHash =
      lastEntry && match.lastEvents?.length
        ? computeTurnHash(
            lastEntry.stateHashAfter,
            match.lastEvents.map((e) => e.id),
          )
        : undefined;

    const preStateSource = match.lastPreState ?? match.state;

    for (const [socket, info] of this.socketMap.entries()) {
      if (info.matchId !== match.matchId) continue;

      if (info.isSpectator) {
        const spectatorState = filterStateForSpectator(match.state);
        const spectatorPreState = filterStateForSpectator(preStateSource);
        send(socket, {
          type: 'gameState',
          matchId: match.matchId,
          result: {
            matchId: match.matchId,
            playerId: 'spectator',
            preState: spectatorPreState,
            postState: spectatorState,
            action: lastAction,
            events: match.lastEvents ?? [],
            turnHash,
          },
          spectatorCount,
        });
      } else {
        const player = match.players.find((p) => p?.playerId === info.playerId);
        if (player) {
          const playerState = filterStateForPlayer(match.state, player.playerIndex);
          const playerPreState = filterStateForPlayer(preStateSource, player.playerIndex);
          send(socket, {
            type: 'gameState',
            matchId: match.matchId,
            result: {
              matchId: match.matchId,
              playerId: player.playerId,
              preState: playerPreState,
              postState: playerState,
              action: lastAction,
              events: match.lastEvents ?? [],
              turnHash,
            },
            spectatorCount,
          });
        }
      }
    }
  }
}
