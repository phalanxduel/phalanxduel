import { randomUUID } from 'node:crypto';
import type { WebSocket } from 'ws';
import type { GameState, Action, ServerMessage } from '@phalanx/shared';
import { computeStateHash } from '@phalanx/shared/hash';
import {
  createInitialState,
  drawCards,
  applyAction,
  validateAction,
} from '@phalanx/engine';
import type { GameConfig } from '@phalanx/engine';

interface PlayerConnection {
  playerId: string;
  playerName: string;
  playerIndex: number;
  socket: WebSocket | null;
}

interface MatchInstance {
  matchId: string;
  players: [PlayerConnection, PlayerConnection | null];
  state: GameState | null;
  config: GameConfig | null;
  actionHistory: Action[];
  createdAt: number;
  lastActivityAt: number;
}

function send(socket: WebSocket | null, message: ServerMessage): void {
  if (socket && socket.readyState === 1) {
    socket.send(JSON.stringify(message));
  }
}

/** Redact opponent hand/drawpile, replace with counts */
export function filterStateForPlayer(state: GameState, playerIndex: number): GameState {
  const players = state.players.map((ps, idx) => {
    if (idx === playerIndex) return ps;
    return {
      ...ps,
      hand: [],
      drawpile: [],
      handCount: ps.hand.length,
      drawpileCount: ps.drawpile.length,
    };
  }) as [typeof state.players[0], typeof state.players[1]];
  return { ...state, players };
}

/** TTL constants in milliseconds */
const GAME_OVER_TTL = 5 * 60 * 1000;   // 5 minutes
const ABANDONED_TTL = 10 * 60 * 1000;   // 10 minutes

export class MatchManager {
  matches = new Map<string, MatchInstance>();
  socketMap = new Map<WebSocket, { matchId: string; playerId: string }>();
  onMatchRemoved: (() => void) | null = null;

  createMatch(
    playerName: string,
    socket: WebSocket,
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
      state: null,
      config: null,
      actionHistory: [],
      createdAt: now,
      lastActivityAt: now,
    };

    this.matches.set(matchId, match);
    this.socketMap.set(socket, { matchId, playerId });

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
    this.socketMap.set(socket, { matchId, playerId });

    // Initialize game state
    const p0 = match.players[0]!;
    const rngSeed = Date.now();
    const config: GameConfig = {
      players: [
        { id: p0.playerId, name: p0.playerName },
        { id: playerId, name: playerName },
      ],
      rngSeed,
    };
    let state = createInitialState(config);

    // Draw 12 cards for each player (fills hand for 8 deploy + extras)
    state = drawCards(state, 0, 12);
    state = drawCards(state, 1, 12);

    // Move to deployment phase
    state = { ...state, phase: 'deployment' };
    match.state = state;
    match.config = config;

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
    this.socketMap.set(socket, { matchId, playerId });

    // Send current state to reconnecting player
    if (match.state) {
      send(socket, {
        type: 'gameState',
        matchId,
        state: filterStateForPlayer(match.state, player.playerIndex),
      });
    }

    // Notify opponent
    const opponent = match.players.find((p) => p?.playerId !== playerId);
    if (opponent) {
      send(opponent.socket, { type: 'opponentReconnected', matchId });
    }
  }

  handleAction(matchId: string, playerId: string, action: Action): void {
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
    if (action.playerIndex !== player.playerIndex) {
      throw new ActionError(matchId, 'Action playerIndex does not match', 'PLAYER_MISMATCH');
    }

    // Validate the action
    const validation = validateAction(match.state, action);
    if (!validation.valid) {
      throw new ActionError(
        matchId,
        validation.error ?? 'Invalid action',
        'INVALID_ACTION',
      );
    }

    // Apply the action with hash and timestamp for transaction log
    match.lastActivityAt = Date.now();
    try {
      match.state = applyAction(match.state, action, {
        hashFn: (s) => computeStateHash(s),
        timestamp: new Date().toISOString(),
      });
      match.actionHistory.push(action);
    } catch (err) {
      throw new ActionError(
        matchId,
        err instanceof Error ? err.message : 'Action failed',
        'ACTION_FAILED',
      );
    }

    // Broadcast updated state
    this.broadcastState(match);
  }

  handleDisconnect(socket: WebSocket): void {
    const info = this.socketMap.get(socket);
    if (!info) return;

    this.socketMap.delete(socket);
    const match = this.matches.get(info.matchId);
    if (!match) return;

    const player = match.players.find((p) => p?.playerId === info.playerId);
    if (player) {
      player.socket = null;
    }

    // Notify opponent
    const opponent = match.players.find(
      (p) => p !== null && p.playerId !== info.playerId,
    );
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
        // Clean up socket references
        for (const player of match.players) {
          if (player?.socket) {
            this.socketMap.delete(player.socket);
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
    for (const player of match.players) {
      if (player) {
        send(player.socket, {
          type: 'gameState',
          matchId: match.matchId,
          state: filterStateForPlayer(match.state, player.playerIndex),
        });
      }
    }
  }
}

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
