import type { Action, PhalanxTurnResult } from '@phalanxduel/shared';
import { computeStateHash, computeTurnHash } from '@phalanxduel/shared/hash';
import {
  applyAction,
  deriveEventsFromEntry,
  validateAction,
  createInitialState,
} from '@phalanxduel/engine';
import type { GameConfig } from '@phalanxduel/engine';
import { TelemetryName } from '@phalanxduel/shared';
import type { ILedgerStore } from './db/ledger-store.js';
import { ActionError, type MatchInstance } from './match-types.js';
import { recordAction, recordPhaseTransition } from './telemetry.js';

export function hasUnrecoverableError(match: MatchInstance): boolean {
  return (match.fatalEvents ?? []).some((event) => event.status === 'unrecoverable_error');
}

export class MatchActor {
  private currentExecution = Promise.resolve<unknown>(undefined);

  constructor(
    public readonly matchId: string,
    public readonly match: MatchInstance,
    private readonly ledgerStore: ILedgerStore,
  ) {}

  public get state() {
    return this.match.state;
  }

  async initializeGame(onComplete: () => Promise<void> | void): Promise<void> {
    const p = this.currentExecution.then(async () => {
      if (this.match.state) return; // already init

      const p0 = this.match.players[0];
      const p1 = this.match.players[1];
      if (!p0 || !p1) {
        throw new ActionError(this.matchId, 'Match is not ready to start', 'MATCH_NOT_READY');
      }

      const createdAtIso = new Date(this.match.createdAt).toISOString();
      const config = {
        ...this.match.config,
        players: [
          { id: p0.playerId, name: p0.playerName },
          { id: p1.playerId, name: p1.playerName },
        ],
        drawTimestamp: createdAtIso,
      };
      const gameConfig = config as unknown as GameConfig;

      // Since MatchActor imports GameConfig we can cast it
      const preInitState = createInitialState(gameConfig);
      this.match.lastPreState = preInitState;

      const applyOptions = {
        hashFn: (s: unknown) => computeStateHash(s),
        allowSystemInit: true,
      };

      const initAction = { type: 'system:init', timestamp: createdAtIso } as Action;
      this.match.state = applyAction(preInitState, initAction, applyOptions);
      this.match.config = gameConfig;

      const initEntry = this.match.state.transactionLog?.at(-1);
      const initialStateHash = initEntry?.stateHashAfter ?? computeStateHash(this.match.state);
      this.match.lifecycleEvents.push({
        id: `${this.matchId}:lc:game_initialized`,
        type: 'functional_update',
        name: TelemetryName.EVENT_GAME_INITIALIZED,
        timestamp: createdAtIso,
        payload: { initialStateHash },
        status: 'ok',
      });

      if (initEntry) {
        await this.ledgerStore.appendAction({
          matchId: this.matchId,
          sequenceNumber: initEntry.sequenceNumber,
          action: initEntry.action,
          stateHashBefore: initEntry.stateHashBefore,
          stateHashAfter: initEntry.stateHashAfter,
        });
      }

      await (onComplete as () => Promise<void> | void)();
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
    callbacks: {
      onSuccess: (match: MatchInstance) => void;
      onError: (match: MatchInstance, error: unknown) => void;
    },
  ): Promise<PhalanxTurnResult> {
    const p = this.currentExecution.then(async () => {
      try {
        const result = await this.executeAction(playerId, action);
        callbacks.onSuccess(this.match);
        return result;
      } catch (err) {
        callbacks.onError(this.match, err);
        throw err;
      }
    });

    this.currentExecution = p.catch((err: unknown) => {
      console.error('[MatchActor] Action execution failed:', err);
      return undefined;
    });
    return p;
  }

  private async executeAction(playerId: string, action: Action): Promise<PhalanxTurnResult> {
    this.assertAuthorizedPlayer(playerId, action);
    const serverAction = this.prepareValidatedAction(action);

    return recordAction(this.matchId, serverAction, async (): Promise<PhalanxTurnResult> => {
      if (!this.match.state) {
        throw new ActionError(this.matchId, 'Game not initialized', 'GAME_NOT_INIT');
      }

      const preState = this.match.state;
      const historyBefore = [...this.match.actionHistory];

      try {
        this.match.lastPreState = preState;
        const postState = applyAction(preState, serverAction, {
          hashFn: (s) => computeStateHash(s),
        });

        this.match.state = postState;
        this.match.actionHistory.push(serverAction);

        const lastEntry = postState.transactionLog?.at(-1);
        this.match.lastEvents = lastEntry ? deriveEventsFromEntry(lastEntry, this.matchId) : [];

        if (lastEntry && this.match.lastEvents.length > 0) {
          lastEntry.turnHash = computeTurnHash(
            lastEntry.stateHashAfter,
            this.match.lastEvents.map((e) => e.id),
          );
          await this.ledgerStore.appendAction({
            matchId: this.matchId,
            sequenceNumber: lastEntry.sequenceNumber,
            action: lastEntry.action,
            stateHashBefore: lastEntry.stateHashBefore,
            stateHashAfter: lastEntry.stateHashAfter,
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
          events: this.match.lastEvents,
          action: serverAction,
          turnHash: lastEntry?.turnHash,
        };
      } catch (err) {
        // Rollback state and history on failure
        this.match.state = preState;
        this.match.actionHistory = historyBefore;
        throw err;
      }
    });
  }

  private assertAuthorizedPlayer(playerId: string, action: Action): void {
    const player = this.match.players.find((candidate) => candidate?.playerId === playerId);
    if (!player) {
      throw new ActionError(this.matchId, 'Player not found in this match', 'PLAYER_NOT_FOUND');
    }

    if ('playerIndex' in action) {
      const actualIndex = this.match.players.indexOf(player);
      if (action.playerIndex !== actualIndex) {
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

        if (!this.match.config) {
          throw new Error('[MatchActor] Cannot rehydrate: match.config is missing');
        }
        const preInitState = createInitialState(this.match.config);
        this.match.state = preInitState;
        this.match.actionHistory = [];

        const applyOptions = {
          hashFn: (s: unknown) => computeStateHash(s),
          allowSystemInit: true,
        };

        for (const entry of actions) {
          this.match.state = applyAction(this.match.state, entry.action, applyOptions);
          this.match.actionHistory.push(entry.action);
        }

        const lastEntry = actions.at(-1);
        if (lastEntry) {
          const logEntry = this.match.state.transactionLog?.at(-1);
          this.match.lastEvents = logEntry ? deriveEventsFromEntry(logEntry, this.matchId) : [];
        }
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

  private prepareValidatedAction(action: Action): Action {
    if (!this.match.state) {
      throw new ActionError(this.matchId, 'Game not initialized', 'GAME_NOT_INIT');
    }

    if (hasUnrecoverableError(this.match)) {
      throw new ActionError(
        this.matchId,
        'Match halted after an unrecoverable engine error',
        'MATCH_UNRECOVERABLE_ERROR',
      );
    }

    const serverAction = { ...action, timestamp: new Date().toISOString() };
    const validation = validateAction(this.match.state, serverAction);
    if (!validation.valid) {
      throw new ActionError(this.matchId, validation.error ?? 'Invalid action', 'ILLEGAL_ACTION');
    }

    return serverAction;
  }
}
