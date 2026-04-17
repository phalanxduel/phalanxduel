import type {
  Action,
  PhalanxTurnResult,
  GameState,
  PhalanxEvent,
  MatchParameters,
} from '@phalanxduel/shared';
import { computeStateHash, computeTurnHash } from '@phalanxduel/shared/hash';
import {
  applyAction,
  deriveEventsFromEntry,
  validateAction,
  createInitialState,
} from '@phalanxduel/engine';
import type { GameConfig } from '@phalanxduel/engine';
import { TelemetryName } from '@phalanxduel/shared';
import type { ILedgerStore, LedgerAction } from './db/ledger-store.js';
import { ActionError, type MatchInstance } from './match-types.js';
import { recordAction, recordPhaseTransition } from './telemetry.js';
import type { IEventBus, MatchUpdatedEvent } from './event-bus.js';

export function hasUnrecoverableError(match: MatchInstance): boolean {
  return (match.fatalEvents ?? []).some((event) => event.status === 'unrecoverable_error');
}

export class MatchActor {
  private _state: GameState | null = null;
  private _config: GameConfig | null = null;
  private _actionHistory: Action[] = [];
  private _lastEvents: PhalanxEvent[] = [];
  private _lastPreState: GameState | null = null;
  private _lifecycleEvents: PhalanxEvent[] = [];
  private _fatalEvents: PhalanxEvent[] = [];
  private _fatalError: Error | null = null;
  private _authorizedPlayers: { playerId: string; playerIndex: number }[] = [];
  private currentExecution = Promise.resolve<unknown>(undefined);
  private unsubscribe?: () => void;

  constructor(
    public readonly matchId: string,
    private readonly ledgerStore: ILedgerStore,
    initialData?: {
      state: GameState | null;
      config: GameConfig | null;
      lifecycleEvents?: PhalanxEvent[];
      fatalEvents?: PhalanxEvent[];
    },
  ) {
    if (initialData) {
      this._state = initialData.state;
      this._config = initialData.config;
      this._lifecycleEvents = initialData.lifecycleEvents ?? [];
      this._fatalEvents = initialData.fatalEvents ?? [];
      if (this._config) {
        this.recoverPlayers();
      }
    }
  }

  public get state(): GameState | null {
    return this._state;
  }
  public get config(): GameConfig | null {
    return this._config;
  }
  public get lastEvents(): PhalanxEvent[] {
    return this._lastEvents;
  }
  public get lastPreState(): GameState | null {
    return this._lastPreState;
  }
  public get lifecycleEvents(): PhalanxEvent[] {
    return this._lifecycleEvents;
  }
  public get fatalEvents(): PhalanxEvent[] {
    return this._fatalEvents;
  }
  public get actionHistory(): Action[] {
    return this._actionHistory;
  }

  async initializeGame(
    initialData: {
      players: { playerId: string; playerName: string }[];
      createdAt: number;
    },
    onComplete: (result: {
      state: GameState;
      config: GameConfig;
      lifecycleEvents: PhalanxEvent[];
    }) => Promise<void> | void,
    eventBus?: IEventBus,
  ): Promise<void> {
    if (eventBus) {
      await this.subscribeToUpdates(eventBus, async () => {
        // External sync events handled by Catchup inside actor.
      });
    }

    const p = this.currentExecution.then(async () => {
      await this._doInitialization(initialData, onComplete);
    });

    this.currentExecution = p.catch((err: unknown) => {
      console.error('[MatchActor] Execution chain failed:', err);
      return undefined;
    });
    return p;
  }

  async dispatchAction(
    playerId: string,
    action: Action,
    authorizedPlayers: { playerId: string; playerIndex: number }[],
    callbacks: {
      onSuccess: (result: PhalanxTurnResult) => void | Promise<void>;
      onError: (error: unknown) => void | Promise<void>;
    },
  ): Promise<PhalanxTurnResult> {
    const p = this.currentExecution.then(async () => {
      try {
        const result = await this.executeAction(playerId, action, authorizedPlayers);
        await callbacks.onSuccess(result);
        return result;
      } catch (err) {
        await callbacks.onError(err);
        throw err;
      }
    });

    this.currentExecution = p.catch((err: unknown) => {
      console.error('[MatchActor] Action execution failed:', err);
      return undefined;
    });
    return p;
  }

  private async executeAction(
    playerId: string,
    action: Action,
    authorizedPlayers: { playerId: string; playerIndex: number }[],
  ): Promise<PhalanxTurnResult> {
    this.assertAuthorizedPlayer(playerId, action, authorizedPlayers);
    const currentSeq = (this._state?.transactionLog ?? []).length - 1;
    const lastEntry = this._state?.transactionLog?.at(-1);

    // 1. De-duplication check (Prioritize replay)
    if (action.msgId && lastEntry?.msgId === action.msgId) {
      console.log(
        `[MatchActor:${this.matchId}] Duplicate msgId detected: ${action.msgId}. Replaying result.`,
      );
      if (!this._lastPreState) {
        throw new ActionError(
          this.matchId,
          'Cannot replay duplicate: pre-state lost',
          'INTERNAL_ERROR',
        );
      }
      return {
        matchId: this.matchId,
        playerId,
        preState: this._lastPreState,
        postState: this._state!,
        events: this._lastEvents,
        action: lastEntry.action,
        turnHash: lastEntry.turnHash,
      };
    }

    // 2. Freshness check
    if (action.expectedSequenceNumber !== undefined) {
      if (action.expectedSequenceNumber !== currentSeq + 1) {
        throw new ActionError(
          this.matchId,
          `Stale action: expected sequence ${action.expectedSequenceNumber} but next sequence is ${currentSeq + 1}`,
          'STALE_ACTION',
        );
      }
    }

    const serverAction = this.prepareValidatedAction(action);

    return recordAction(this.matchId, serverAction, async (): Promise<PhalanxTurnResult> => {
      if (!this._state) {
        throw new ActionError(this.matchId, 'Game not initialized', 'GAME_NOT_INIT');
      }

      const preState = this._state;
      const historyBefore = [...this._actionHistory];

      try {
        this._lastPreState = preState;
        const postState = applyAction(preState, serverAction, {
          hashFn: (s) => computeStateHash(s),
        });

        this._state = postState;
        const lastEntry = postState.transactionLog?.at(-1);
        this._lastEvents = lastEntry ? deriveEventsFromEntry(lastEntry, this.matchId) : [];

        if (lastEntry) {
          lastEntry.turnHash = computeTurnHash(
            lastEntry.stateHashAfter,
            this._lastEvents.map((e) => e.id),
          );
          lastEntry.msgId = action.msgId ?? null;

          await this.ledgerStore.appendAction({
            matchId: this.matchId,
            sequenceNumber: lastEntry.sequenceNumber,
            action: lastEntry.action,
            stateHashBefore: lastEntry.stateHashBefore,
            stateHashAfter: lastEntry.stateHashAfter,
            msgId: lastEntry.msgId,
          });

          if (preState.phase !== postState.phase) {
            recordPhaseTransition(this.matchId, preState.phase, postState.phase);
          }
        }

        return {
          matchId: this.matchId,
          playerId,
          preState,
          postState,
          events: this._lastEvents,
          action: serverAction,
          turnHash: lastEntry?.turnHash,
        };
      } catch (err) {
        this._state = preState;
        this._actionHistory = historyBefore;
        if (!(err instanceof ActionError)) {
          this._fatalError = err instanceof Error ? err : new Error(String(err));
        }
        throw err;
      }
    });
  }

  private assertAuthorizedPlayer(
    playerId: string,
    action: Action,
    authorizedPlayers?: { playerId: string; playerIndex: number }[],
  ): void {
    const playersToCheck =
      authorizedPlayers && authorizedPlayers.length > 0
        ? authorizedPlayers
        : this._authorizedPlayers;

    const player = playersToCheck.find((candidate) => candidate?.playerId === playerId);
    if (!player) {
      throw new ActionError(this.matchId, 'Player not found in this match', 'PLAYER_NOT_FOUND');
    }

    if ('playerIndex' in action && typeof action.playerIndex === 'number') {
      if (action.playerIndex !== player.playerIndex) {
        throw new ActionError(
          this.matchId,
          'Player index does not match authenticated identity',
          'UNAUTHORIZED_ACTION',
        );
      }
    }
  }

  async rehydrate(): Promise<void> {
    const p = this.currentExecution.then(async () => {
      try {
        const actions = await this.ledgerStore.getActions(this.matchId);
        if (actions.length === 0) return;

        const initEntry = actions.find((a) => a.action.type === 'system:init');
        if (!initEntry) return;

        if (!this._config) {
          throw new Error('[MatchActor] Cannot rehydrate: config is missing');
        }
        const preInitState = createInitialState(this._config);
        this._state = preInitState;
        this._actionHistory = [];

        const applyOptions = {
          hashFn: (s: unknown) => computeStateHash(s),
          allowSystemInit: true,
        };

        for (const entry of actions) {
          this._state = applyAction(this._state, entry.action, applyOptions);
          this._actionHistory.push(entry.action);
        }

        const lastEntry = actions.at(-1);
        if (lastEntry) {
          const logEntry = this._state?.transactionLog?.at(-1);
          this._lastEvents = logEntry ? deriveEventsFromEntry(logEntry, this.matchId) : [];
        }

        this.recoverPlayers();
      } catch (err: unknown) {
        console.error(`[MatchActor:${this.matchId}] rehydrate failed:`, err);
        throw err;
      }
    });

    this.currentExecution = p.catch((err: unknown) => {
      console.error('[MatchActor] Rehydrate chain failed:', err);
      return undefined;
    });
    return p;
  }

  /**
   * Subscribe to external updates for this match.
   * When a notification is received, the actor will catch up its local state.
   */
  async subscribeToUpdates(
    eventBus: IEventBus,
    onSync?: () => Promise<void> | void,
  ): Promise<void> {
    if (this.unsubscribe) return;

    this.unsubscribe = await eventBus.subscribeMatchUpdate(this.matchId, async (event) => {
      await this.catchUp(event, onSync);
    });
  }

  /**
   * Catch up local state by fetching any missing actions from the ledger.
   */
  async catchUp(event: MatchUpdatedEvent, onSync?: () => Promise<void> | void): Promise<void> {
    try {
      const currentSeq = (this._state?.transactionLog ?? []).length - 1;

      if (event.sequenceNumber <= currentSeq) {
        if (onSync) await onSync();
        return;
      }

      let newActions: LedgerAction[] = [];
      let attempts = 0;
      const maxAttempts = 5;
      const retryDelay = 200;

      while (attempts < maxAttempts) {
        newActions = await this.ledgerStore.getActionsFrom(this.matchId, currentSeq + 1);
        if (newActions.length > 0) break;

        attempts++;
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }

      if (newActions.length > 0) {
        const applyOptions = {
          hashFn: (s: unknown) => computeStateHash(s),
          allowSystemInit: true,
        };

        for (const entry of newActions) {
          if (!this._state) {
            this._state = createInitialState(this._config as unknown as GameConfig);
          }
          this._state = applyAction(this._state, entry.action, applyOptions);
          this._actionHistory.push(entry.action);
        }

        const logEntry = this._state?.transactionLog?.at(-1);
        if (logEntry) {
          this._lastEvents = deriveEventsFromEntry(logEntry, this.matchId);
        }
      }

      if (onSync) {
        await onSync();
      }
    } catch (err: unknown) {
      console.error(`[MatchActor:${this.matchId}] Distributed catch-up failed:`, err);
    }
  }

  /**
   * Clean up resources, including active subscriptions.
   */
  async destroy(): Promise<void> {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = undefined;
    }
  }
  private prepareValidatedAction(action: Action): Action {
    if (!this._state) {
      throw new ActionError(this.matchId, 'Game not initialized', 'GAME_NOT_INIT');
    }

    if (this._fatalError || this._fatalEvents.some((e) => e.status === 'unrecoverable_error')) {
      throw new ActionError(
        this.matchId,
        'Match halted after an unrecoverable engine error',
        'MATCH_UNRECOVERABLE_ERROR',
      );
    }

    const serverAction = { ...action, timestamp: new Date().toISOString() };
    const validation = validateAction(this._state, serverAction);
    if (!validation.valid) {
      throw new ActionError(this.matchId, validation.error ?? 'Invalid action', 'ILLEGAL_ACTION');
    }

    return serverAction;
  }

  private _buildGameConfig(
    players: { playerId: string; playerName: string }[],
    createdAtIso: string,
  ): GameConfig {
    if (players.length < 2 || !players[0] || !players[1]) {
      throw new ActionError(this.matchId, 'Match is not ready to start', 'MATCH_NOT_READY');
    }

    return {
      matchId: this.matchId,
      rngSeed: this._config?.rngSeed ?? Date.now(),
      matchParams: this._config?.matchParams ??
        (this._state as unknown as { params: MatchParameters })?.params ?? {
          rows: 2,
          columns: 4,
          maxHandSize: 12,
          initialDraw: 12,
        },
      gameOptions: this._config?.gameOptions,
      players: [
        { id: players[0].playerId, name: players[0].playerName },
        { id: players[1].playerId, name: players[1].playerName },
      ],
      drawTimestamp: createdAtIso,
    };
  }

  private recoverPlayers(): void {
    if (!this._config) return;
    this._authorizedPlayers = this._config.players.map((p, idx) => ({
      playerId: p.id,
      playerIndex: idx,
    }));
  }

  private async _doInitialization(
    initialData: {
      players: { playerId: string; playerName: string }[];
      createdAt: number;
    },
    onComplete: (res: {
      state: GameState;
      config: GameConfig;
      lifecycleEvents: PhalanxEvent[];
    }) => Promise<void> | void,
  ): Promise<void> {
    if (this._state) return; // already init

    const createdAtIso = new Date(initialData.createdAt).toISOString();
    const gameConfig = this._buildGameConfig(initialData.players, createdAtIso);

    // Since MatchActor imports GameConfig we can cast it
    const preInitState = createInitialState(gameConfig);
    this._lastPreState = preInitState;

    const applyOptions = {
      hashFn: (s: unknown) => computeStateHash(s),
      allowSystemInit: true,
    };

    const initAction = { type: 'system:init', timestamp: createdAtIso } as Action;
    console.log(`[MatchActor:${this.matchId}] Applying system:init action...`);
    this._state = applyAction(preInitState, initAction, applyOptions);
    this._config = gameConfig;

    const initEntry = this._state.transactionLog?.at(-1);
    console.log(
      `[MatchActor:${this.matchId}] system:init result: seq=${initEntry?.sequenceNumber}, logSize=${this._state.transactionLog?.length}`,
    );

    const initialStateHash = initEntry?.stateHashAfter ?? computeStateHash(this._state);
    this._lifecycleEvents.push({
      id: `${this.matchId}:lc:game_initialized`,
      type: 'functional_update',
      name: TelemetryName.EVENT_GAME_INITIALIZED,
      timestamp: createdAtIso,
      payload: { initialStateHash },
      status: 'ok',
    });

    if (initEntry) {
      console.log(`[MatchActor:${this.matchId}] Appending system:init to ledger...`);
      await this.ledgerStore.appendAction({
        matchId: this.matchId,
        sequenceNumber: initEntry.sequenceNumber,
        action: initEntry.action,
        stateHashBefore: initEntry.stateHashBefore,
        stateHashAfter: initEntry.stateHashAfter,
        msgId: initEntry.msgId ?? null,
      });
    } else {
      console.warn(`[MatchActor:${this.matchId}] NO initEntry found after applyAction!`);
    }

    this.recoverPlayers();

    await onComplete({
      state: this._state,
      config: this._config,
      lifecycleEvents: this._lifecycleEvents,
    });
  }
}
