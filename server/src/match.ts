import { randomUUID } from 'node:crypto';
import type { WebSocket } from 'ws';
import { DEFAULT_MATCH_PARAMS, TelemetryName } from '@phalanxduel/shared';
import type {
  GameState,
  Action,
  ServerMessage,
  GameOptions,
  PlayerState,
  CreateMatchParamsPartial,
  MatchEventLog,
  PhalanxEvent,
  Battlefield,
} from '@phalanxduel/shared';
import { computeStateHash, computeTurnHash } from '@phalanxduel/shared/hash';
import { createInitialState, applyAction, deriveEventsFromEntry } from '@phalanxduel/engine';
import type { GameConfig } from '@phalanxduel/engine';
import type { ILedgerStore, IEventBus } from './db/state-interfaces.js';

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

type SocketInfo =
  | { matchId: string; playerId: string; isSpectator: false }
  | { matchId: string; spectatorId: string; isSpectator: true };

/** Redact card details in event log for public/spectator view (Layer 6) */
export function filterEventLogForPublic(log: MatchEventLog): MatchEventLog {
  const events = log.events.map((ev) => {
    const payload = { ...ev.payload };
    if (ev.name === TelemetryName.EVENT_COMBAT_STEP && payload.card) {
      const card = payload.card as Record<string, unknown>;
      payload.card = { ...card, suit: 'spades', face: '?', value: 0, type: 'number' };
    }
    return { ...ev, payload };
  });
  return { ...log, events, fingerprint: computeStateHash(events) };
}

/** Builds the unified MatchEventLog for a match (Layer 7) */
export function buildMatchEventLog(matchId: string, state: GameState): MatchEventLog {
  const turnEvents: PhalanxEvent[] = (state.transactionLog ?? []).flatMap((entry) =>
    deriveEventsFromEntry(entry, matchId),
  );
  return {
    matchId,
    events: turnEvents,
    fingerprint: computeStateHash(turnEvents),
    generatedAt: new Date().toISOString(),
  };
}

function redactBattlefield(battlefield: Battlefield): Battlefield {
  return battlefield.map((cell) => {
    if (!cell?.faceDown) return cell;
    return {
      ...cell,
      card: {
        id: cell.card.id,
        suit: 'spades',
        face: '?',
        value: 0,
        type: 'number',
      },
    };
  });
}

function redactHiddenCards(ps: PlayerState): PlayerState {
  return {
    ...ps,
    battlefield: redactBattlefield(ps.battlefield),
    hand: [],
    drawpile: [],
    discardPile: ps.discardPile.length > 0 ? [ps.discardPile[ps.discardPile.length - 1]!] : [],
    handCount: ps.hand.length,
    drawpileCount: ps.drawpile.length,
    discardPileCount: ps.discardPile.length,
  };
}

export function filterStateForPlayer(state: GameState, playerIndex: number): GameState {
  const players = state.players.map((ps, idx) => {
    if (idx === playerIndex) return { ...ps, discardPileCount: ps.discardPile.length };
    return redactHiddenCards(ps);
  });

  const transactionLog = state.transactionLog?.map((entry) => {
    const action = { ...entry.action } as Action & { cardId?: string };
    if (action.type === 'deploy' || action.type === 'reinforce') {
      action.cardId = 'hidden';
    }
    return { ...entry, action };
  });

  return { ...state, players: [players[0]!, players[1]!], transactionLog };
}

export function filterStateForSpectator(state: GameState): GameState {
  const players = state.players.map((ps) => redactHiddenCards(ps));
  return { ...state, players: [players[0]!, players[1]!] };
}

/**
 * MatchActor: The domain logic host (Layer 7).
 */
export class MatchActor {
  private state: GameState | null = null;
  private config: GameConfig | null = null;
  private currentSeq = -1;
  private sockets = new Map<WebSocket, SocketInfo>();

  constructor(
    public readonly matchId: string,
    private readonly ledger: ILedgerStore,
    private readonly eventBus: IEventBus,
  ) {}

  getState() {
    return this.state;
  }
  getConfig() {
    return this.config;
  }

  async addSocket(socket: WebSocket, info: SocketInfo) {
    this.sockets.set(socket, info);
    await this.sync();
  }

  removeSocket(socket: WebSocket) {
    this.sockets.delete(socket);
  }

  hasSockets() {
    return this.sockets.size > 0;
  }

  async sync() {
    try {
      if (!this.config) {
        const cfg = await this.ledger.getMatchConfig(this.matchId);
        if (!cfg) return;
        this.config = cfg;
      }

      if (this.currentSeq === -1) {
        const snapshot = await this.ledger.getLatestSnapshot(this.matchId);
        if (snapshot) {
          this.state = snapshot.state;
          this.currentSeq = snapshot.seq;
        } else {
          this.state = createInitialState(this.config);
          this.currentSeq = -1;
        }
      }

      const newActions = await this.ledger.getActions(this.matchId, this.currentSeq);
      for (const action of newActions) {
        if (!this.state) break;
        this.state = applyAction(this.state, action, { hashFn: computeStateHash });
        this.currentSeq++;
      }

      if (newActions.length > 0 && this.state) {
        this.broadcast();
      }
    } catch (err) {
      console.error(`[MatchActor:${this.matchId}] Sync failed:`, err);
    }
  }

  async handleAction(action: Action) {
    if (!this.state) throw new ActionError(this.matchId, 'Match not initialized', 'NOT_INIT');
    const nextState = applyAction(this.state, action, { hashFn: computeStateHash });
    const hash = computeStateHash(nextState);
    const nextSeq = this.currentSeq + 1;
    await this.ledger.appendAction(this.matchId, action, hash, nextSeq);
    this.state = nextState;
    this.currentSeq = nextSeq;
    await this.eventBus.notifyUpdate(this.matchId);
    this.broadcast();
  }

  async getFullHistory(): Promise<Action[]> {
    return await this.ledger.getActions(this.matchId, -1);
  }

  private broadcast() {
    if (!this.state) return;
    const lastEntry = this.state.transactionLog?.at(-1);
    const lastAction = lastEntry?.action ?? ({ type: 'system:init', timestamp: '' } as Action);
    const turnHash = lastEntry ? computeTurnHash(lastEntry.stateHashAfter, []) : '';

    for (const [socket, info] of this.sockets.entries()) {
      if (socket.readyState !== 1) continue;

      const playerIndex = info.isSpectator
        ? -1
        : this.state.players.findIndex((p) => p.player.id === info.playerId);
      const redactedState = info.isSpectator
        ? filterStateForSpectator(this.state)
        : filterStateForPlayer(this.state, playerIndex);

      const message: ServerMessage = {
        type: 'gameState',
        matchId: this.matchId,
        result: {
          matchId: this.matchId,
          playerId: info.isSpectator ? 'spectator' : info.playerId,
          postState: redactedState,
          preState: redactedState,
          action: lastAction,
          events: [],
          turnHash,
        },
        spectatorCount: this.sockets.size,
      };
      socket.send(JSON.stringify(message));
    }
  }
}

/**
 * MatchManager: The Session Layer Supervisor (Layer 5).
 */
export class MatchManager {
  private actors = new Map<string, MatchActor>();
  public socketMap = new Map<WebSocket, SocketInfo>();
  public onMatchRemoved: (() => void) | null = null;

  constructor(
    private readonly ledger: ILedgerStore,
    private readonly eventBus: IEventBus,
  ) {
    this.eventBus.subscribe(async (matchId) => {
      const actor = this.actors.get(matchId);
      if (actor) await actor.sync();
    });
  }

  async getMatch(matchId: string) {
    const actor = await this.getOrCreateActor(matchId);
    return {
      matchId: actor.matchId,
      config: actor.getConfig(),
      state: actor.getState(),
    };
  }

  async createMatch(
    playerName: string,
    socket: WebSocket | null,
    options?: {
      gameOptions?: GameOptions;
      rngSeed?: number;
      matchParams?: CreateMatchParamsPartial;
      userId?: string;
    },
  ): Promise<{ matchId: string; playerId: string; playerIndex: number }> {
    const matchId = randomUUID();
    const pId = randomUUID();
    const config: GameConfig = {
      matchId,
      players: [
        { id: pId, name: playerName },
        { id: 'pending', name: 'Waiting...' },
      ],
      rngSeed: options?.rngSeed ?? Date.now(),
      drawTimestamp: new Date().toISOString(),
      gameOptions: options?.gameOptions,
      matchParams: resolveMatchParams(options?.matchParams),
    };
    await this.ledger.createMatch(matchId, config);

    const actor = await this.getOrCreateActor(matchId);

    // SYSTEM INIT ACTION
    await actor.handleAction({
      type: 'system:init',
      timestamp: new Date().toISOString(),
    } as Action);

    if (socket) {
      const info: SocketInfo = { matchId, playerId: pId, isSpectator: false };
      this.socketMap.set(socket, info);
      await actor.addSocket(socket, info);

      const msg: ServerMessage = { type: 'matchCreated', matchId, playerId: pId, playerIndex: 0 };
      socket.send(JSON.stringify(msg));
    }

    return { matchId, playerId: pId, playerIndex: 0 };
  }

  async joinMatch(
    matchId: string,
    _playerName: string,
    socket: WebSocket,
    _userId?: string,
  ): Promise<{ playerId: string; playerIndex: number }> {
    const actor = await this.getOrCreateActor(matchId);
    const pId = randomUUID();
    const info: SocketInfo = { matchId, playerId: pId, isSpectator: false };
    this.socketMap.set(socket, info);
    await actor.addSocket(socket, info);

    const msg: ServerMessage = { type: 'matchJoined', matchId, playerId: pId, playerIndex: 1 };
    socket.send(JSON.stringify(msg));

    return { playerId: pId, playerIndex: 1 };
  }

  async watchMatch(matchId: string, socket: WebSocket): Promise<{ spectatorId: string }> {
    const actor = await this.getOrCreateActor(matchId);
    const sId = randomUUID();
    const info: SocketInfo = { matchId, spectatorId: sId, isSpectator: true };
    this.socketMap.set(socket, info);
    await actor.addSocket(socket, info);

    const msg: ServerMessage = { type: 'spectatorJoined', matchId, spectatorId: sId };
    socket.send(JSON.stringify(msg));

    return { spectatorId: sId };
  }

  getActorForSocket(socket: WebSocket): MatchActor | null {
    const info = this.socketMap.get(socket);
    return info ? this.actors.get(info.matchId) || null : null;
  }

  handleDisconnect(socket: WebSocket) {
    const info = this.socketMap.get(socket);
    if (info) {
      const actor = this.actors.get(info.matchId);
      actor?.removeSocket(socket);
    }
    this.socketMap.delete(socket);
  }

  public async getOrCreateActor(matchId: string): Promise<MatchActor> {
    let actor = this.actors.get(matchId);
    if (!actor) {
      actor = new MatchActor(matchId, this.ledger, this.eventBus);
      this.actors.set(matchId, actor);
      void actor.sync();
    }
    return actor;
  }

  async getGlobalStats() {
    return {
      totalMatches: this.actors.size,
      activeMatches: Array.from(this.actors.values()).filter(
        (a) => a.getState()?.phase !== 'gameOver',
      ).length,
      completedMatches: Array.from(this.actors.values()).filter(
        (a) => a.getState()?.phase === 'gameOver',
      ).length,
    };
  }

  createPendingMatch() {
    const matchId = randomUUID();
    return { matchId };
  }

  async listActiveMatches() {
    return Array.from(this.actors.values()).map((a) => ({
      matchId: a.matchId,
      players: [],
      spectatorCount: 0,
      phase: a.getState()?.phase ?? null,
      turnNumber: a.getState()?.turnNumber ?? 0,
      ageSeconds: 0,
      lastActivitySeconds: 0,
    }));
  }

  updatePlayerIdentity(_s: WebSocket, _id: string, _name: string) {}
  cleanupMatches() {
    return Promise.resolve(0);
  }
}

function resolveMatchParams(
  matchParams?: CreateMatchParamsPartial,
): NonNullable<GameConfig['matchParams']> {
  const rows = matchParams?.rows ?? DEFAULT_MATCH_PARAMS.rows;
  const columns = matchParams?.columns ?? DEFAULT_MATCH_PARAMS.columns;
  return {
    rows,
    columns,
    maxHandSize: Math.min(DEFAULT_MATCH_PARAMS.maxHandSize, columns),
    initialDraw: rows * columns + columns,
  };
}
