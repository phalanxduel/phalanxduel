import { EventEmitter } from 'node:events';
import type { Action, GameState } from '@phalanxduel/shared';
import type { GameConfig } from '@phalanxduel/engine';
import type { ILedgerStore, IEventBus } from './state-interfaces.js';

/**
 * InMemoryLedgerStore: Data Link layer implementation for local dev.
 */
export class InMemoryLedgerStore implements ILedgerStore {
  private readonly configs = new Map<string, GameConfig>();
  private readonly ledgers = new Map<string, Action[]>();
  private readonly snapshots = new Map<string, { state: GameState; seq: number }>();

  async createMatch(matchId: string, config: GameConfig): Promise<void> {
    this.configs.set(matchId, structuredClone(config));
    this.ledgers.set(matchId, []);
  }

  async getMatchConfig(matchId: string): Promise<GameConfig | null> {
    const config = this.configs.get(matchId);
    return config ? structuredClone(config) : null;
  }

  async appendAction(
    matchId: string,
    action: Action,
    _stateHashAfter: string,
    expectedSeq: number,
  ): Promise<number> {
    const ledger = this.ledgers.get(matchId);
    if (!ledger) throw new Error('Match not found');

    // Layer 2 Integrity: Enforce strict sequencing
    if (ledger.length !== expectedSeq) {
      throw new Error(`Sequence mismatch: expected ${ledger.length}, got ${expectedSeq}`);
    }

    ledger.push(structuredClone(action));
    return expectedSeq;
  }

  async getActions(matchId: string, sinceSeq: number): Promise<Action[]> {
    const ledger = this.ledgers.get(matchId);
    if (!ledger) return [];
    return ledger.slice(sinceSeq + 1).map((a) => structuredClone(a));
  }

  async saveSnapshot(matchId: string, state: GameState, seq: number): Promise<void> {
    this.snapshots.set(matchId, { state: structuredClone(state), seq });
  }

  async getLatestSnapshot(matchId: string): Promise<{ state: GameState; seq: number } | null> {
    const snapshot = this.snapshots.get(matchId);
    return snapshot ? structuredClone(snapshot) : null;
  }
}

/**
 * EventEmitterBus: Network layer implementation for local dev.
 */
export class EventEmitterBus implements IEventBus {
  private readonly emitter = new EventEmitter();

  async notifyUpdate(matchId: string): Promise<void> {
    setImmediate(() => {
      this.emitter.emit('match_updated', matchId);
    });
  }

  subscribe(handler: (matchId: string) => void): void {
    this.emitter.on('match_updated', handler);
  }
}
