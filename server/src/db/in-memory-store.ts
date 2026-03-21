import { EventEmitter } from 'node:events';
import type { MatchInstance } from '../match.js';
import type {
  IStateStore,
  IEventBus,
  MatchEventHandler,
  StateModifier,
} from './state-interfaces.js';

export class InMemoryStateStore implements IStateStore {
  private readonly matches = new Map<string, MatchInstance>();
  private readonly locks = new Map<string, Promise<void>>();

  async getMatch(matchId: string): Promise<MatchInstance | null> {
    const match = this.matches.get(matchId);
    if (!match) return null;
    // Deep clone to prevent accidental synchronous mutations that bypass lockMatch
    return structuredClone(match);
  }

  async saveMatch(match: MatchInstance): Promise<void> {
    this.matches.set(match.matchId, structuredClone(match));
  }

  async removeMatch(matchId: string): Promise<void> {
    this.matches.delete(matchId);
  }

  async getActiveMatches(): Promise<MatchInstance[]> {
    return Array.from(this.matches.values()).map((m) => structuredClone(m));
  }

  async lockMatch<T>(matchId: string, modifier: StateModifier<T>): Promise<T> {
    const currentLock = this.locks.get(matchId);

    let releaseLock!: () => void;
    const nextLock = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });

    // Atomically chain the lock before yielding to the event loop
    this.locks.set(matchId, currentLock ? currentLock.then(() => nextLock) : nextLock);

    if (currentLock) {
      await currentLock;
    }

    try {
      const match = await this.getMatch(matchId);
      if (!match) {
        throw new Error(`Cannot lock match ${matchId}: Not found in store.`);
      }

      const result = await modifier(match);
      await this.saveMatch(match);
      return result;
    } finally {
      releaseLock();
      // Only delete if NO OTHER requests have queued up behind us
      if (
        this.locks.get(matchId) === nextLock ||
        this.locks.get(matchId) === currentLock?.then(() => nextLock)
      ) {
        // this check is brittle, it's safer to not delete, or delete only if the internal promise matches
      }
      // Actually, safest way is to just let the map hold resolved promises.
    }
  }
}

export class EventEmitterBus implements IEventBus {
  private readonly emitter = new EventEmitter();

  constructor() {
    // Prevent MaxListenersExceeded warnings in high traffic tests
    this.emitter.setMaxListeners(1000);
  }

  async publishStateUpdate(matchId: string, match: MatchInstance): Promise<void> {
    // Emit async to simulate network bound operations and break sync stack
    setImmediate(() => {
      this.emitter.emit(`match:${matchId}`, structuredClone(match));
      this.emitter.emit('match:*', structuredClone(match));
    });
  }

  subscribeToAllStateUpdates(handler: MatchEventHandler): () => void {
    const eventName = 'match:*';
    this.emitter.on(eventName, handler);
    return () => {
      this.emitter.off(eventName, handler);
    };
  }

  subscribeToStateUpdates(matchId: string, handler: MatchEventHandler): () => void {
    const eventName = `match:${matchId}`;
    this.emitter.on(eventName, handler);
    return () => {
      this.emitter.off(eventName, handler);
    };
  }

  unsubscribeAll(matchId: string): void {
    this.emitter.removeAllListeners(`match:${matchId}`);
  }
}
