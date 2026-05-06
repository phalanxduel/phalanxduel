import type { Action, GameState, PhalanxEvent, PhalanxTurnResult } from '@phalanxduel/shared';
import { DEFAULT_MATCH_PARAMS } from '@phalanxduel/shared';
import { computeStateHash, computeTurnHash } from '@phalanxduel/shared/hash';
import {
  applyAction,
  deriveEventsFromEntry,
  validateAction,
  createInitialState,
  computeBotAction,
} from '@phalanxduel/engine';
import type { GameConfig, BotConfig } from '@phalanxduel/engine';
import { TelemetryName, isRetry, isStale, isGameOver } from '@phalanxduel/shared';
import type { ILedgerStore, LedgerAction } from './db/ledger-store.js';
import { ActionError } from './match-types.js';
import { recordAction, recordPhaseTransition } from './telemetry.js';
import type { IEventBus, MatchUpdatedEvent } from './event-bus.js';

type SystemInitAction = Extract<Action, { type: 'system:init' }>;

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
  private _botConfig: BotConfig | null = null;
  private _botPlayerIndex: number | null = null;
  private _botStrategy: 'random' | 'heuristic' | null = null;
  private currentExecution = Promise.resolve<unknown>(undefined);
  private unsubscribe?: () => void;
  public onStateUpdated?: (result: PhalanxTurnResult) => void | Promise<void>;

  constructor(
    public readonly matchId: string,
    private readonly ledgerStore: ILedgerStore,
    initialData?: {
      state: GameState | null;
      config: GameConfig | null;
      lifecycleEvents?: PhalanxEvent[];
      fatalEvents?: PhalanxEvent[];
      botConfig?: BotConfig;
      botPlayerIndex?: number;
      botStrategy?: 'random' | 'heuristic';
    },
  ) {
    if (initialData) {
      this._state = initialData.state;
      this._config = initialData.config;
      this._lifecycleEvents = initialData.lifecycleEvents ?? [];
      this._fatalEvents = initialData.fatalEvents ?? [];
      this._botConfig = initialData.botConfig ?? null;
      this._botPlayerIndex = initialData.botPlayerIndex ?? null;
      this._botStrategy = initialData.botStrategy ?? null;

      if (
        this._botPlayerIndex !== null &&
        this._botPlayerIndex !== 0 &&
        this._botPlayerIndex !== 1
      ) {
        throw new Error('botPlayerIndex must be 0 or 1');
      }
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
  public get botConfig(): BotConfig | null {
    return this._botConfig;
  }
  public get botPlayerIndex(): number | null {
    return this._botPlayerIndex;
  }
  public get botStrategy(): 'random' | 'heuristic' | null {
    return this._botStrategy;
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

  public applyResult(result: {
    state: GameState;
    config: GameConfig;
    lifecycleEvents: PhalanxEvent[];
  }): void {
    this._state = result.state;
    this._config = result.config;
    this._lifecycleEvents = result.lifecycleEvents;
    this.recoverPlayers();
  }

  public configureBotOpponent(options: {
    botConfig: BotConfig;
    botPlayerIndex: number;
    botStrategy: 'random' | 'heuristic';
  }): void {
    if (options.botPlayerIndex !== 0 && options.botPlayerIndex !== 1) {
      throw new Error('botPlayerIndex must be 0 or 1');
    }
    this._botConfig = options.botConfig;
    this._botPlayerIndex = options.botPlayerIndex;
    this._botStrategy = options.botStrategy;
  }

  public addFatalEvent(event: PhalanxEvent): void {
    if (!this._fatalEvents.some((e) => e.id === event.id)) {
      this._fatalEvents = [...this._fatalEvents, event];
    }
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
    const p = this.currentExecution.then(() =>
      this.executeAndCallback(playerId, action, authorizedPlayers, callbacks),
    );

    this.currentExecution = p.catch((err: unknown) => {
      console.error('[MatchActor] Action execution failed:', err);
      return undefined;
    });
    void p.then(() => this.checkForBotTurn()).catch(() => {});
    return p;
  }

  private async executeAction(
    playerId: string,
    action: Action,
    authorizedPlayers: { playerId: string; playerIndex: number }[],
  ): Promise<PhalanxTurnResult> {
    this.assertAuthorizedPlayer(playerId, action, authorizedPlayers);
    this._authorizedPlayers = authorizedPlayers;
    const currentSeq = (this._state?.transactionLog ?? []).length - 1;
    const lastEntry = this._state?.transactionLog?.at(-1);

    // 1. De-duplication check (Prioritize replay)
    if (isRetry(action, lastEntry)) {
      console.log(
        `[MatchActor:${this.matchId}] Duplicate msgId detected: ${action.msgId}. Replaying result.`,
      );
      if (!this._lastPreState || !this._state || !lastEntry) {
        throw new ActionError(
          this.matchId,
          'Cannot replay duplicate: state lost',
          'INTERNAL_ERROR',
        );
      }
      return {
        matchId: this.matchId,
        playerId,
        preState: this._lastPreState,
        postState: this._state,
        events: this._lastEvents,
        action: lastEntry.action,
        turnHash: lastEntry.turnHash,
      };
    }

    // 2. Freshness check
    if (isStale(action, currentSeq)) {
      throw new ActionError(
        this.matchId,
        `Stale action: expected sequence ${action.expectedSequenceNumber} but next sequence is ${currentSeq + 1}`,
        'STALE_ACTION',
      );
    }

    const serverAction = this.prepareValidatedAction(action);

    // prepareValidatedAction always stamps a fresh server-side timestamp onto the action.
    // Use that same timestamp as the canonical timestamp for all engine operations
    // (including card-draw IDs) so the transaction log and local re-simulation stay in sync.
    const applyOptions = {
      hashFn: (s: unknown) => computeStateHash(s),
      timestamp: serverAction.timestamp,
    };

    return recordAction(this.matchId, serverAction, async (): Promise<PhalanxTurnResult> => {
      if (!this._state) {
        throw new ActionError(this.matchId, 'Game not initialized', 'GAME_NOT_INIT');
      }

      const preState = this._state;
      const historyBefore = [...this._actionHistory];

      try {
        this._lastPreState = preState;
        const postState = applyAction(preState, serverAction, applyOptions);

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

          this._actionHistory.push(lastEntry.action);
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

    const player = playersToCheck.find((candidate) => candidate.playerId === playerId);
    if (!player) {
      // If index matches a bot, allow it even if playerId doesn't match (bots are identified by index)
      if (
        this._botPlayerIndex !== null &&
        'playerIndex' in action &&
        action.playerIndex === this._botPlayerIndex
      ) {
        return;
      }
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

        // AUTHENTIC RECOVERY: Trust the ledger's embedded config as the ultimate source of truth.
        // This ensures that even if database metadata is corrupted or stale, re-play remains deterministic.
        const initAction = initEntry.action as SystemInitAction;
        const ledgerConfig = initAction.config;
        if (ledgerConfig) {
          this._config = ledgerConfig;
        }

        if (!this._config) {
          throw new ActionError(
            this.matchId,
            '[MatchActor] Cannot rehydrate: authoritative game configuration missing',
            'MATCH_UNRECOVERABLE_ERROR',
          );
        }

        // Use the exact timestamp from the system:init action to seed card generation.
        // This ensures the initial hand is identical to the one generated during the first run.
        const drawTimestamp = initAction.timestamp || this._config.drawTimestamp;
        const rehydrateConfig = {
          ...this._config,
          drawTimestamp,
        };

        const preInitState = createInitialState(rehydrateConfig);
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
          const logEntry = this._state.transactionLog?.at(-1);
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
          this._state ??= createInitialState(this._config as unknown as GameConfig);
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
    if (this.botTimer) {
      clearTimeout(this.botTimer);
      this.botTimer = null;
    }
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = undefined;
    }
  }

  private botTimer: ReturnType<typeof setTimeout> | null = null;

  private checkForBotTurn(): void {
    if (this.botTimer) {
      clearTimeout(this.botTimer);
      this.botTimer = null;
    }

    if (!this._botConfig || !this._state || this._botPlayerIndex === null) return;
    if (isGameOver(this._state)) return;
    if (this._state.activePlayerIndex !== this._botPlayerIndex) return;

    const botIdx = this._botPlayerIndex as 0 | 1;
    const botPlayer = this._authorizedPlayers.find((p) => p.playerIndex === botIdx);
    if (!botPlayer) return;

    this.botTimer = setTimeout(() => {
      this.botTimer = null;
      if (!this._state || isGameOver(this._state)) return;
      if (this._state.activePlayerIndex !== botIdx) return;
      if (!this._botConfig) return;

      const turnSeed = this._botConfig.seed + this._state.turnNumber;
      const action = computeBotAction(this._state, botIdx, {
        ...this._botConfig,
        seed: turnSeed,
      });

      void this.dispatchAction(botPlayer.playerId, action, this._authorizedPlayers, {
        onSuccess: () => {},
        onError: () => {},
      }).catch(() => {
        // Bot generated invalid action — handleAction already logs via telemetry
      });
    }, 300);
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
      matchParams: this._config?.matchParams ?? this._state?.params ?? DEFAULT_MATCH_PARAMS,
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

    if (this._botPlayerIndex !== null && this._botConfig) {
      const existingBot = this._authorizedPlayers.find(
        (p) => p.playerIndex === this._botPlayerIndex,
      );
      if (!existingBot) {
        // This can happen during initial bot match setup before config.players is fully synced
        // or during recovery if bot identity isn't in config.
        // We ensure bot is always 'authorized' to act.
        this._authorizedPlayers.push({
          playerId: 'bot', // Placeholder, will be matched by index in assertAuthorizedPlayer
          playerIndex: this._botPlayerIndex,
        });
      }
    }
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
    this._authorizedPlayers = initialData.players.map((p, idx) => ({
      playerId: p.playerId,
      playerIndex: idx,
    }));
    const gameConfig = this._buildGameConfig(initialData.players, createdAtIso);

    // Since MatchActor imports GameConfig we can cast it
    const preInitState = createInitialState(gameConfig);
    this._lastPreState = preInitState;

    const applyOptions = {
      hashFn: (s: unknown) => computeStateHash(s),
      allowSystemInit: true,
    };

    const initAction: SystemInitAction = {
      type: 'system:init',
      timestamp: createdAtIso,
      config: gameConfig,
    };
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

      this.checkForBotTurn();
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
  private async executeAndCallback(
    playerId: string,
    action: Action,
    authorizedPlayers: { playerId: string; playerIndex: number }[],
    callbacks: {
      onSuccess: (result: PhalanxTurnResult) => void | Promise<void>;
      onError: (error: unknown) => void | Promise<void>;
    },
  ): Promise<PhalanxTurnResult> {
    try {
      const result = await this.executeAction(playerId, action, authorizedPlayers);

      if (this.onStateUpdated) {
        await this.onStateUpdated(result);
      }

      await callbacks.onSuccess(result);
      return result;
    } catch (err) {
      await callbacks.onError(err);
      throw err;
    }
  }
}
