import { randomUUID } from 'node:crypto';
import type { WebSocket } from 'ws';
import type {
  GameState,
  Action,
  ServerMessage,
  GameOptions,
  PlayerState,
} from '@phalanxduel/shared';
import { computeStateHash } from '@phalanxduel/shared/hash';
import { createInitialState, applyAction, validateAction } from '@phalanxduel/engine';
import type { GameConfig } from '@phalanxduel/engine';
import { GameTelemetry } from './telemetry.js';
import * as Sentry from '@sentry/node';

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
  socket: WebSocket | null;
}

interface SpectatorConnection {
  spectatorId: string;
  socket: WebSocket | null;
}

type SocketInfo =
  | { matchId: string; playerId: string; isSpectator: false }
  | { matchId: string; spectatorId: string; isSpectator: true };

interface MatchInstance {
  matchId: string;
  players: [PlayerConnection, PlayerConnection | null];
  spectators: SpectatorConnection[];
  state: GameState | null;
  config: GameConfig | null;
  actionHistory: Action[];
  gameOptions?: GameOptions;
  rngSeed?: number;
  createdAt: number;
  lastActivityAt: number;
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

  createMatch(
    playerName: string,
    socket: WebSocket,
    gameOptions?: GameOptions,
    rngSeed?: number,
  ): { matchId: string; playerId: string; playerIndex: number } {
    const matchId = randomUUID();
    const playerId = randomUUID();
    const playerIndex = 0;

    const player: PlayerConnection = {
      playerId,
      playerName,
      playerIndex,
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
      createdAt: now,
      lastActivityAt: now,
    };

    this.matches.set(matchId, match);
    this.socketMap.set(socket, { matchId, playerId, isSpectator: false });

    if (typeof Sentry.metrics?.count === 'function') {
      Sentry.metrics.count('match.lifecycle', 1, { attributes: { event: 'created' } });
    }

    return { matchId, playerId, playerIndex };
  }

  joinMatch(
    matchId: string,
    playerName: string,
    socket: WebSocket,
  ): { playerId: string; playerIndex: number } {
    const match = this.matches.get(matchId);
    if (!match) {
      throw new MatchError('Match not found', 'MATCH_NOT_FOUND');
    }
    if (match.players[1] !== null) {
      throw new MatchError('Match is full', 'MATCH_FULL');
    }

    const playerId = randomUUID();
    const playerIndex = 1;

    const player: PlayerConnection = {
      playerId,
      playerName,
      playerIndex,
      socket,
    };

    match.players[1] = player;
    match.lastActivityAt = Date.now();
    this.socketMap.set(socket, { matchId, playerId, isSpectator: false });

    // Initialize game state
    const p0 = match.players[0]!;
    const rngSeed = match.rngSeed ?? Date.now();
    const config: GameConfig = {
      matchId,
      players: [
        { id: p0.playerId, name: p0.playerName },
        { id: playerId, name: playerName },
      ],
      rngSeed,
      gameOptions: match.gameOptions,
    };
    // createInitialState handles initial 12-card draw and sets phase to StartTurn
    const state = createInitialState(config);

    // Transition to first action phase (AttackPhase) via system:init
    match.state = applyAction(state, {
      type: 'system:init',
      timestamp: new Date().toISOString(),
    });
    match.config = config;

    if (typeof Sentry.metrics?.count === 'function') {
      Sentry.metrics.count('match.lifecycle', 1, { attributes: { event: 'started' } });
    }
    GameTelemetry.recordPhaseTransition(matchId, 'StartTurn', 'AttackPhase');

    // Note: caller is responsible for sending matchJoined before calling broadcastState
    return { playerId, playerIndex };
  }

  /** Broadcast current game state to all players in a match */
  broadcastMatchState(matchId: string): void {
    const match = this.matches.get(matchId);
    if (match) {
      this.broadcastState(match);
    }
  }

  reconnect(matchId: string, playerId: string, socket: WebSocket): void {
    const match = this.matches.get(matchId);
    if (!match) {
      throw new MatchError('Match not found', 'MATCH_NOT_FOUND');
    }

    const player = match.players.find((p) => p?.playerId === playerId);
    if (!player) {
      throw new MatchError('Player not in this match', 'PLAYER_NOT_FOUND');
    }

    player.socket = socket;
    this.socketMap.set(socket, { matchId, playerId, isSpectator: false });

    // Send current state to reconnecting player
    if (match.state) {
      send(socket, {
        type: 'gameState',
        matchId,
        result: {
          matchId,
          playerId,
          preState: match.state,
          postState: filterStateForPlayer(match.state, player.playerIndex),
          action: match.actionHistory[match.actionHistory.length - 1] ?? {
            type: 'system:init',
            timestamp: new Date().toISOString(),
          },
          events: [],
        },
      });
    }

    // Notify opponent
    const opponent = match.players.find((p) => p?.playerId !== playerId);
    if (opponent) {
      send(opponent.socket, { type: 'opponentReconnected', matchId });
    }
  }

  async handleAction(matchId: string, playerId: string, action: Action): Promise<void> {
    const match = this.matches.get(matchId);
    if (!match) {
      throw new MatchError('Match not found', 'MATCH_NOT_FOUND');
    }
    if (!match.state) {
      throw new ActionError(matchId, 'Game has not started', 'GAME_NOT_STARTED');
    }

    // Find the player's index
    const player = match.players.find((p) => p?.playerId === playerId);
    if (!player) {
      throw new ActionError(matchId, 'Player not in this match', 'PLAYER_NOT_FOUND');
    }

    // Verify the action's playerIndex matches the authenticated player
    if (action.type !== 'system:init' && action.playerIndex !== player.playerIndex) {
      throw new ActionError(matchId, 'Action playerIndex does not match', 'PLAYER_MISMATCH');
    }

    // Validate the action
    const validation = validateAction(match.state, action);
    if (!validation.valid) {
      throw new ActionError(matchId, validation.error ?? 'Invalid action', 'INVALID_ACTION');
    }

    // Apply the action with hash and timestamp for transaction log
    match.lastActivityAt = Date.now();

    await GameTelemetry.recordAction(matchId, action, async () => {
      const phaseBefore = match.state!.phase;
      const postState = applyAction(match.state!, action, {
        hashFn: (s) => computeStateHash(s),
        timestamp: new Date().toISOString(),
      });

      // Track phase transition for visibility
      if (postState.phase !== phaseBefore) {
        GameTelemetry.recordPhaseTransition(matchId, phaseBefore, postState.phase);
      }

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
            data: { matchId, combat },
          });
        }
      }

      if (match.state.phase === 'gameOver') {
        if (typeof Sentry.metrics?.count === 'function') {
          Sentry.metrics.count('match.lifecycle', 1, {
            attributes: {
              event: 'completed',
              victory_type: match.state.outcome?.victoryType ?? 'unknown',
            },
          });
        }
      }

      return {
        matchId,
        playerId,
        preState: match.state!,
        postState,
        action,
      };
    });

    // Broadcast updated state
    this.broadcastState(match);
  }

  /** Register a spectator socket for a match and return spectatorId */
  watchMatch(matchId: string, socket: WebSocket): { spectatorId: string } {
    const match = this.matches.get(matchId);
    if (!match) {
      throw new MatchError('Match not found', 'MATCH_NOT_FOUND');
    }

    const spectatorId = randomUUID();
    const spectator: SpectatorConnection = { spectatorId, socket };
    match.spectators.push(spectator);
    this.socketMap.set(socket, { matchId, spectatorId, isSpectator: true });

    return { spectatorId };
  }

  handleDisconnect(socket: WebSocket): void {
    const info = this.socketMap.get(socket);
    if (!info) return;

    this.socketMap.delete(socket);
    const match = this.matches.get(info.matchId);
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
