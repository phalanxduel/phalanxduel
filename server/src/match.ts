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
} from '@phalanxduel/shared';
import { DEFAULT_MATCH_PARAMS } from '@phalanxduel/shared';
import { computeStateHash } from '@phalanxduel/shared/hash';
import {
  createInitialState,
  applyAction,
  computeBotAction,
  type BotConfig,
} from '@phalanxduel/engine';
import type { GameConfig } from '@phalanxduel/engine';
import { GameTelemetry } from './telemetry.js';
import * as Sentry from '@sentry/node';
import { MatchRepository } from './db/match-repo.js';

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
}

export interface MatchInstance {
  matchId: string;
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
  createdAt: number;
  lastActivityAt: number;
}

function resolveMatchParams(
  matchParams?: CreateMatchParamsPartial,
): NonNullable<GameConfig['matchParams']> {
  const rows = matchParams?.rows ?? DEFAULT_MATCH_PARAMS.rows;
  const columns = matchParams?.columns ?? DEFAULT_MATCH_PARAMS.columns;
  const requestedMaxHandSize = matchParams?.maxHandSize ?? DEFAULT_MATCH_PARAMS.maxHandSize;
  const maxHandSize = Math.min(requestedMaxHandSize, columns);
  const expectedInitialDraw = rows * columns + columns;
  const requestedInitialDraw = matchParams?.initialDraw ?? expectedInitialDraw;
  const initialDraw =
    requestedInitialDraw === expectedInitialDraw ? requestedInitialDraw : expectedInitialDraw;

  return { rows, columns, maxHandSize, initialDraw };
}

function send(socket: WebSocket | null, message: ServerMessage): void {
  if (socket && socket.readyState === 1) {
    socket.send(JSON.stringify(message));
  }
}

/** Redact both players' hands/drawpiles for spectator view */
export function filterStateForSpectator(state: GameState): GameState {
  const players = state.players.map((ps) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { hand, drawpile, ...rest } = ps;
    return {
      ...rest,
      hand: [],
      drawpile: [],
      handCount: ps.hand.length,
      drawpileCount: ps.drawpile.length,
    } as PlayerState;
  });
  return { ...state, players: [players[0]!, players[1]!] };
}

/** Redact opponent hand/drawpile, replace with counts */
export function filterStateForPlayer(state: GameState, playerIndex: number): GameState {
  const players = state.players.map((ps, idx) => {
    if (idx === playerIndex) return ps;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { hand, drawpile, ...rest } = ps;
    return {
      ...rest,
      hand: [],
      drawpile: [],
      handCount: ps.hand.length,
      drawpileCount: ps.drawpile.length,
    } as PlayerState;
  });
  return { ...state, players: [players[0]!, players[1]!] };
}

/** TTL constants in milliseconds */
const GAME_OVER_TTL = 5 * 60 * 1000; // 5 minutes
const ABANDONED_TTL = 10 * 60 * 1000; // 10 minutes

export class MatchManager {
  matches = new Map<string, MatchInstance>();
  socketMap = new Map<WebSocket, SocketInfo>();
  onMatchRemoved: (() => void) | null = null;
  private matchRepo = new MatchRepository();

  async getMatch(matchId: string): Promise<MatchInstance | null> {
    const match = this.matches.get(matchId);
    if (match) return match;

    const dbMatch = await this.matchRepo.getMatch(matchId);
    if (dbMatch) {
      this.matches.set(matchId, dbMatch);
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
    const { gameOptions, rngSeed, botOptions, matchParams, userId } = options ?? {};
    const matchId = randomUUID();
    const playerId = randomUUID();
    const playerIndex = 0;

    const player: PlayerConnection = {
      playerId,
      playerName,
      playerIndex,
      userId,
      socket,
    };

    const now = Date.now();
    const match: MatchInstance = {
      matchId,
      players: [player, null],
      spectators: [],
      state: null,
      config: null,
      actionHistory: [],
      gameOptions,
      rngSeed,
      matchParams,
      createdAt: now,
      lastActivityAt: now,
    };

    if (botOptions) {
      const botPlayerId = randomUUID();
      const botPlayer: PlayerConnection = {
        playerId: botPlayerId,
        playerName: botOptions.opponent === 'bot-heuristic' ? 'Bot (Heuristic)' : 'Bot (Random)',
        playerIndex: 1,
        socket: null,
      };
      match.players[1] = botPlayer;
      match.botConfig = botOptions.botConfig;
      match.botPlayerIndex = 1;
      match.botStrategy = botOptions.opponent === 'bot-heuristic' ? 'heuristic' : 'random';
    }

    this.matches.set(matchId, match);
    if (socket) {
      this.socketMap.set(socket, { matchId, playerId, isSpectator: false });
    }

    if (typeof Sentry.metrics?.count === 'function') {
      Sentry.metrics.count('match.lifecycle', 1, { attributes: { event: 'created' } });
    }

    // For bot matches, initialize the game immediately
    if (botOptions) {
      this.initializeGame(match);
    }

    void this.matchRepo.saveMatch(match);

    return { matchId, playerId, playerIndex };
  }

  createPendingMatch(matchId = randomUUID()): { matchId: string } {
    const now = Date.now();
    const match: MatchInstance = {
      matchId,
      players: [null, null],
      spectators: [],
      state: null,
      config: null,
      actionHistory: [],
      createdAt: now,
      lastActivityAt: now,
    };
    this.matches.set(matchId, match);
    return { matchId };
  }

  async joinMatch(
    matchId: string,
    playerName: string,
    socket: WebSocket,
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
    };

    match.players[playerIndex] = player;
    match.lastActivityAt = Date.now();
    this.socketMap.set(socket, { matchId, playerId, isSpectator: false });

    // REST-created pending matches may have no host yet; only initialize once both slots are filled.
    if (match.players[0] === null || match.players[1] === null) {
      return { playerId, playerIndex };
    }

    this.initializeGame(match);
    void this.matchRepo.saveMatch(match);

    // Note: caller is responsible for sending matchJoined before calling broadcastState
    return { playerId, playerIndex };
  }

  async watchMatch(matchId: string, socket: WebSocket): Promise<{ spectatorId: string }> {
    const match = await this.getMatch(matchId);
    if (!match) {
      throw new MatchError('Match not found', 'MATCH_NOT_FOUND');
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
      }

      // Notify opponent
      const opponent = match.players.find((p) => p !== null && p.playerId !== info.playerId);
      if (opponent) {
        send(opponent.socket, {
          type: 'opponentDisconnected',
          matchId: info.matchId,
        });
      }
    })();
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
          if (typeof Sentry.metrics?.count === 'function') {
            Sentry.metrics.count('match.lifecycle', 1, { attributes: { event: 'abandoned' } });
          }
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
    const resolvedMatchParams = resolveMatchParams(match.matchParams);
    const config: GameConfig = {
      matchId: match.matchId,
      players: [
        { id: p0.playerId, name: p0.playerName },
        { id: p1.playerId, name: p1.playerName },
      ],
      rngSeed,
      gameOptions: match.gameOptions,
      matchParams: resolvedMatchParams,
    };
    // createInitialState handles initial 12-card draw and sets phase to StartTurn
    const preInitState = createInitialState(config);

    // Transition to the first action phase via system:init (mode-dependent).
    match.state = applyAction(
      preInitState,
      {
        type: 'system:init',
        timestamp: new Date().toISOString(),
      },
      {
        hashFn: (s) => computeStateHash(s),
      },
    );
    match.config = config;

    if (typeof Sentry.metrics?.count === 'function') {
      Sentry.metrics.count('match.lifecycle', 1, { attributes: { event: 'started' } });
    }
    if (match.state.phase !== preInitState.phase) {
      GameTelemetry.recordPhaseTransition(match.matchId, preInitState.phase, match.state.phase);
    }

    this.broadcastState(match);
    this.scheduleBotTurn(match);
  }

  async handleAction(matchId: string, playerId: string, action: Action): Promise<void> {
    const match = await this.getMatch(matchId);
    if (!match) {
      throw new ActionError(matchId, 'Match not found', 'MATCH_NOT_FOUND');
    }

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
      const postState = applyAction(preState, action, {
        hashFn: (s) => computeStateHash(s),
        timestamp: new Date().toISOString(),
      });

      match.state = postState;
      match.actionHistory.push(action);

      // Emit granular telemetry from the transaction log entry
      const lastEntry = postState.transactionLog?.at(-1);
      if (lastEntry) {
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

    // Broadcast updated state
    this.broadcastState(match);

    // Schedule bot turn if this is a bot match
    this.scheduleBotTurn(match);

    void this.matchRepo.saveMatch(match);
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
      const action = computeBotAction(match.state, botIdx as 0 | 1, {
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

  private broadcastState(match: MatchInstance): void {
    if (!match.state) return;
    const spectatorCount = match.spectators.length;
    const lastAction = match.actionHistory[match.actionHistory.length - 1] ?? {
      type: 'system:init',
      timestamp: new Date().toISOString(),
    };

    for (const player of match.players) {
      if (player && player.socket) {
        const playerState = filterStateForPlayer(match.state, player.playerIndex);
        send(player.socket, {
          type: 'gameState',
          matchId: match.matchId,
          result: {
            matchId: match.matchId,
            playerId: player.playerId,
            preState: match.state, // This is still technically post-state contextually
            postState: playerState,
            action: lastAction,
            events: [],
          },
          spectatorCount,
        });
      }
    }
    const spectatorState = filterStateForSpectator(match.state);
    for (const spectator of match.spectators) {
      if (spectator.socket) {
        send(spectator.socket, {
          type: 'gameState',
          matchId: match.matchId,
          result: {
            matchId: match.matchId,
            playerId: 'spectator',
            preState: match.state,
            postState: spectatorState,
            action: lastAction,
            events: [],
          },
          spectatorCount,
        });
      }
    }
  }
}
