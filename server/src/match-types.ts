import type { WebSocket } from 'ws';
import type {
  GameState,
  Action,
  PhalanxEvent,
  GameOptions,
  MatchParameters,
  CreateMatchParamsPartial,
  PhalanxTurnResult,
} from '@phalanxduel/shared';
import type { BotConfig, GameConfig } from '@phalanxduel/engine';

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
  socket: WebSocket | null;
  disconnectedAt?: string;
}

export interface SpectatorConnection {
  spectatorId: string;
  socket: WebSocket | null;
}

export type SocketInfo =
  | { matchId: string; playerId: string; isSpectator: false }
  | { matchId: string; spectatorId: string; isSpectator: true };

export interface BotMatchOptions {
  opponent: 'bot-random' | 'bot-heuristic';
  botConfig: BotConfig;
}

export type MatchVisibility = 'private' | 'public_open';
export type PublicMatchStatus = 'open' | 'claimed' | 'expired' | 'cancelled';

export interface CreateMatchOptions {
  gameOptions?: GameOptions;
  rngSeed?: number;
  botOptions?: BotMatchOptions;
  matchParams?: CreateMatchParamsPartial;
  userId?: string;
  creatorIp?: string;
  visibility?: MatchVisibility;
}

export interface MatchInstance {
  matchId: string;
  creatorIp?: string;
  visibility?: MatchVisibility;
  publicStatus?: PublicMatchStatus | null;
  publicExpiresAt?: string | null;
  minPublicRating?: number | null;
  maxPublicRating?: number | null;
  minGamesPlayed?: number | null;
  requiresEstablishedRating?: boolean;
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
  visibility: MatchVisibility;
  publicStatus: PublicMatchStatus | null;
  creatorUserId: string | null;
  creatorName: string;
  creatorElo: number | null;
  creatorRecord: {
    wins: number;
    losses: number;
    draws: number;
    gamesPlayed: number;
    provisional: boolean;
    confidenceLabel: string;
  } | null;
  requirements: {
    minPublicRating: number | null;
    maxPublicRating: number | null;
    minGamesPlayed: number | null;
    requiresEstablishedRating: boolean;
  } | null;
  joinable: boolean;
  disabledReason: string | null;
  players: { name: string; connected: boolean }[];
  phase: string | null;
  turnNumber: number | null;
  createdAt: number;
  lastActivityAt: number;
  publicExpiresAt: number | null;
}

export interface SpectatorMatchSummary {
  matchId: string;
  status: 'waiting' | 'active';
  phase: string | null;
  turnNumber: number | null;
  player1Name: string | null;
  player2Name: string | null;
  spectatorCount: number;
  isPvP: boolean;
  humanPlayerCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface IMatchManager {
  getMatch(matchId: string): Promise<MatchInstance | null>;
  getMatchSync(matchId: string): MatchInstance | undefined;
  broadcastMatchState(matchId: string): void;
  createMatch(
    playerName: string,
    socket: WebSocket | null,
    options?: CreateMatchOptions,
  ): Promise<{ matchId: string; playerId: string; playerIndex: number }>;
  createPendingMatch(matchId?: string): Promise<{ matchId: string }>;
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
  cancelMatch(matchId: string, userId: string): Promise<boolean>;
  terminateMatch(matchId: string): Promise<boolean>;
  onMatchRemoved: (() => void) | null;
  socketMap: Map<WebSocket, SocketInfo>;
  matches: Map<string, MatchInstance>;
}
