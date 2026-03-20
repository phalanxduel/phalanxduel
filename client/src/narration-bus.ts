import type { CombatBonusType, GamePhase, Suit } from '@phalanxduel/shared';

export type CardType = 'ace' | 'face' | 'number';

export type NarrationEvent =
  | {
      type: 'deploy';
      player: string;
      card: string;
      suit: Suit;
      cardType: CardType;
      column: number;
      row: number;
    }
  | {
      type: 'attack';
      attacker: string;
      target: string;
      damage: number;
      suit: Suit;
      cardType: CardType;
    }
  | { type: 'destroyed'; card: string; suit?: Suit; cardType?: CardType }
  | { type: 'overflow'; target: string; damage: number; suit?: Suit }
  | { type: 'lp-damage'; player: string; damage: number; suit?: Suit }
  | { type: 'pass'; player: string; phase: string }
  | {
      type: 'bonus';
      bonus: CombatBonusType;
      card: string;
      message: string;
      suit?: Suit;
      cardType?: CardType;
    }
  | { type: 'phase-change'; phase: GamePhase };

export interface NarrationEntry {
  event: NarrationEvent;
  delayMs: number;
}

type Subscriber = (event: NarrationEvent) => void;

export class NarrationBus {
  private subscribers: Subscriber[] = [];
  private queue: NarrationEntry[] = [];
  private drainTimer: ReturnType<typeof setTimeout> | null = null;

  subscribe(cb: Subscriber): () => void {
    this.subscribers.push(cb);
    return () => {
      const idx = this.subscribers.indexOf(cb);
      if (idx !== -1) this.subscribers.splice(idx, 1);
    };
  }

  emit(event: NarrationEvent): void {
    for (const cb of [...this.subscribers]) {
      cb(event);
    }
  }

  enqueue(entries: NarrationEntry[]): void {
    this.queue.push(...entries);
    if (!this.drainTimer) this.drain();
  }

  private drain(): void {
    if (this.queue.length === 0) {
      this.drainTimer = null;
      return;
    }

    const entry = this.queue.shift()!;
    this.emit(entry.event);

    this.drainTimer = setTimeout(() => {
      this.drain();
    }, entry.delayMs);
  }

  destroy(): void {
    if (this.drainTimer) {
      clearTimeout(this.drainTimer);
      this.drainTimer = null;
    }
    this.queue = [];
    this.subscribers = [];
  }
}
