# Combat Narration Bus Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a pub/sub narration bus that converts transaction log entries into timed, human-readable combat and deployment narration with two UI consumers (center overlay + left ticker) and proper a11y.

**Architecture:** A `NarrationBus` pub/sub drains a timed queue of `NarrationEvent`s to subscribers. A `NarrationProducer` diffs the transaction log on each game state update and enqueues events. Two consumers render independently: a dramatic center overlay and a persistent left-side ticker with `aria-live`. The existing Pizzazz announcer is replaced; damage pops/shake/splashes remain.

**Tech Stack:** TypeScript, Vitest (jsdom), vanilla DOM, CSS animations, `prefers-reduced-motion`

**Design doc:** `docs/plans/2026-03-08-narration-bus-design.md`

---

## Task 1: NarrationBus — Event Types & Pub/Sub Core

**Files:**

- Create: `client/src/narration-bus.ts`
- Test: `client/tests/narration-bus.test.ts`

#### Step 1: Write the failing tests

Create `client/tests/narration-bus.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NarrationBus, type NarrationEvent } from '../src/narration-bus';

describe('NarrationBus', () => {
  let bus: NarrationBus;

  beforeEach(() => {
    bus = new NarrationBus();
  });

  it('delivers events to subscribers', () => {
    const cb = vi.fn();
    bus.subscribe(cb);
    const event: NarrationEvent = { type: 'deploy', player: 'Mike', card: 'Ace♠' };
    bus.emit(event);
    expect(cb).toHaveBeenCalledWith(event);
  });

  it('supports multiple subscribers', () => {
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    bus.subscribe(cb1);
    bus.subscribe(cb2);
    const event: NarrationEvent = { type: 'destroyed', card: 'Two♦' };
    bus.emit(event);
    expect(cb1).toHaveBeenCalledWith(event);
    expect(cb2).toHaveBeenCalledWith(event);
  });

  it('unsubscribe stops delivery', () => {
    const cb = vi.fn();
    const unsub = bus.subscribe(cb);
    unsub();
    bus.emit({ type: 'deploy', player: 'Bot', card: 'King♥' });
    expect(cb).not.toHaveBeenCalled();
  });

  it('drains timed queue at specified pace', async () => {
    vi.useFakeTimers();
    const cb = vi.fn();
    bus.subscribe(cb);

    bus.enqueue([
      { event: { type: 'deploy', player: 'Mike', card: 'Ace♠' }, delayMs: 100 },
      { event: { type: 'deploy', player: 'Mike', card: 'Two♥' }, delayMs: 100 },
    ]);

    expect(cb).toHaveBeenCalledTimes(1); // First fires immediately
    await vi.advanceTimersByTimeAsync(100);
    expect(cb).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('queues new entries while draining', async () => {
    vi.useFakeTimers();
    const cb = vi.fn();
    bus.subscribe(cb);

    bus.enqueue([
      { event: { type: 'deploy', player: 'Mike', card: 'Ace♠' }, delayMs: 200 },
    ]);
    expect(cb).toHaveBeenCalledTimes(1);

    // Enqueue more before first drain completes
    bus.enqueue([
      { event: { type: 'deploy', player: 'Mike', card: 'Two♥' }, delayMs: 100 },
    ]);

    await vi.advanceTimersByTimeAsync(200);
    expect(cb).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(100);
    expect(cb).toHaveBeenCalledTimes(3);
    vi.useRealTimers();
  });

  it('destroy stops draining and clears queue', async () => {
    vi.useFakeTimers();
    const cb = vi.fn();
    bus.subscribe(cb);

    bus.enqueue([
      { event: { type: 'deploy', player: 'A', card: 'X' }, delayMs: 100 },
      { event: { type: 'deploy', player: 'B', card: 'Y' }, delayMs: 100 },
    ]);
    expect(cb).toHaveBeenCalledTimes(1);

    bus.destroy();
    await vi.advanceTimersByTimeAsync(200);
    expect(cb).toHaveBeenCalledTimes(1); // No more deliveries
    vi.useRealTimers();
  });
});
```

#### Step 2: Run test to verify it fails

Run: `pnpm --filter @phalanxduel/client test -- --run narration-bus`
Expected: FAIL — module not found

#### Step 3: Write minimal implementation

Create `client/src/narration-bus.ts`:

```typescript
import type { CombatBonusType, GamePhase } from '@phalanxduel/shared';

export type NarrationEvent =
  | { type: 'deploy'; player: string; card: string }
  | { type: 'attack'; attacker: string; target: string; damage: number }
  | { type: 'destroyed'; card: string }
  | { type: 'overflow'; target: string; damage: number }
  | { type: 'lp-damage'; player: string; damage: number }
  | { type: 'pass'; player: string; phase: string }
  | { type: 'bonus'; bonus: CombatBonusType; card: string; message: string }
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
    for (const cb of this.subscribers) {
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

    if (this.queue.length > 0) {
      this.drainTimer = setTimeout(() => this.drain(), entry.delayMs);
    } else {
      this.drainTimer = null;
    }
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
```

#### Step 4: Run test to verify it passes

Run: `pnpm --filter @phalanxduel/client test -- --run narration-bus`
Expected: 6 tests PASS

#### Step 5: Commit

```bash
git add client/src/narration-bus.ts client/tests/narration-bus.test.ts
git commit -m "feat(client): add NarrationBus pub/sub with timed queue"
```

---

## Task 2: NarrationProducer — Transaction Log Diffing & Event Generation

**Files:**

- Create: `client/src/narration-producer.ts`
- Test: `client/tests/narration-producer.test.ts`

**Context:** The producer receives `PhalanxTurnResult` (same callback as Pizzazz) and converts transaction log diffs into narration entries.

Key data structures from `shared/src/schema.ts`:
- `TransactionLogEntry.action` — has `type: 'deploy' | 'attack' | 'pass' | ...` and `playerIndex`
- `TransactionLogEntry.details` — discriminated union with combat data for attacks
- `CombatLogEntry` — `attackerCard`, `targetColumn`, `baseDamage`, `totalLpDamage`, `steps[]`
- `CombatLogStep` — `target` ('frontCard'|'backCard'|'playerLp'), `card`, `damage`, `destroyed`, `bonuses`
- Card face names come from `Card.face` (e.g., "King") and `Card.suit` (e.g., "hearts")
- `suitSymbol()` from `client/src/cards.ts` converts suit to unicode (♠♥♦♣)

#### Step 1: Write the failing tests

Create `client/tests/narration-producer.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NarrationProducer } from '../src/narration-producer';
import { NarrationBus, type NarrationEntry } from '../src/narration-bus';
import type {
  PhalanxTurnResult,
  GameState,
  TransactionLogEntry,
  CombatLogEntry,
  Card,
} from '@phalanxduel/shared';

function makeCard(face: string, suit: 'spades' | 'hearts' | 'diamonds' | 'clubs', value: number): Card {
  return { id: `${face}-${suit}`, face, suit, value };
}

function makeGameState(overrides: Partial<GameState> = {}): GameState {
  return {
    phase: 'DeploymentPhase',
    turnNumber: 1,
    activePlayerIndex: 0,
    players: [
      { player: { name: 'Mike', index: 0 }, hand: [], lifePoints: 20, battlefield: { columns: [] } },
      { player: { name: 'Bot', index: 1 }, hand: [], lifePoints: 20, battlefield: { columns: [] } },
    ],
    config: { gridRows: 2, gridColumns: 4 },
    transactionLog: [],
    ...overrides,
  } as GameState;
}

function makeDeployEntry(
  playerIndex: number,
  card: Card,
  seq: number,
): TransactionLogEntry {
  return {
    sequenceNumber: seq,
    action: { type: 'deploy', playerIndex, column: 0, cardId: card.id, timestamp: new Date().toISOString() },
    stateHashBefore: 'a',
    stateHashAfter: 'b',
    timestamp: new Date().toISOString(),
    details: { type: 'deploy', gridIndex: 0, phaseAfter: 'DeploymentPhase' },
  } as TransactionLogEntry;
}

function makeAttackEntry(
  combat: CombatLogEntry,
  seq: number,
): TransactionLogEntry {
  return {
    sequenceNumber: seq,
    action: {
      type: 'attack',
      playerIndex: combat.attackerPlayerIndex,
      attackingColumn: 0,
      defendingColumn: combat.targetColumn,
      timestamp: new Date().toISOString(),
    },
    stateHashBefore: 'a',
    stateHashAfter: 'b',
    timestamp: new Date().toISOString(),
    details: {
      type: 'attack',
      combat,
      reinforcementTriggered: false,
      victoryTriggered: false,
    },
  } as TransactionLogEntry;
}

function makePassEntry(playerIndex: number, seq: number): TransactionLogEntry {
  return {
    sequenceNumber: seq,
    action: { type: 'pass', playerIndex, timestamp: new Date().toISOString() },
    stateHashBefore: 'a',
    stateHashAfter: 'b',
    timestamp: new Date().toISOString(),
    details: { type: 'pass' },
  } as TransactionLogEntry;
}

describe('NarrationProducer', () => {
  let bus: NarrationBus;
  let producer: NarrationProducer;
  let enqueued: NarrationEntry[];

  beforeEach(() => {
    bus = new NarrationBus();
    enqueued = [];
    vi.spyOn(bus, 'enqueue').mockImplementation((entries) => {
      enqueued.push(...entries);
    });
    producer = new NarrationProducer(bus);
  });

  it('skips first call to seed log count (no replay)', () => {
    const gs = makeGameState({
      transactionLog: [makeDeployEntry(0, makeCard('Ace', 'spades', 11), 0)],
    });
    producer.onTurnResult({
      preState: makeGameState(),
      postState: gs,
      action: gs.transactionLog![0].action,
    } as PhalanxTurnResult);

    expect(enqueued).toHaveLength(0);
  });

  it('generates deploy event', () => {
    const card = makeCard('Ace', 'spades', 11);
    // First call seeds
    producer.onTurnResult({
      preState: makeGameState(),
      postState: makeGameState(),
      action: { type: 'pass', playerIndex: 0, timestamp: new Date().toISOString() },
    } as PhalanxTurnResult);

    // Second call with new deploy entry
    const gs = makeGameState({
      transactionLog: [makeDeployEntry(0, card, 0)],
    });
    producer.onTurnResult({
      preState: makeGameState(),
      postState: gs,
      action: gs.transactionLog![0].action,
    } as PhalanxTurnResult);

    expect(enqueued).toHaveLength(1);
    expect(enqueued[0].event).toEqual({
      type: 'deploy',
      player: 'Mike',
      card: 'Ace♠',
    });
  });

  it('generates pass event', () => {
    producer.onTurnResult({
      preState: makeGameState(),
      postState: makeGameState(),
      action: { type: 'pass', playerIndex: 0, timestamp: new Date().toISOString() },
    } as PhalanxTurnResult);

    const gs = makeGameState({
      phase: 'DeploymentPhase',
      transactionLog: [makePassEntry(0, 0)],
    });
    producer.onTurnResult({
      preState: makeGameState(),
      postState: gs,
      action: gs.transactionLog![0].action,
    } as PhalanxTurnResult);

    expect(enqueued).toHaveLength(1);
    expect(enqueued[0].event).toEqual({
      type: 'pass',
      player: 'Mike',
      phase: 'DeploymentPhase',
    });
  });

  it('generates attack sequence with destroy and LP damage', () => {
    producer.onTurnResult({
      preState: makeGameState(),
      postState: makeGameState(),
      action: { type: 'pass', playerIndex: 0, timestamp: new Date().toISOString() },
    } as PhalanxTurnResult);

    const attackerCard = makeCard('King', 'hearts', 10);
    const targetCard = makeCard('Two', 'spades', 2);
    const combat: CombatLogEntry = {
      turnNumber: 1,
      attackerPlayerIndex: 0,
      attackerCard,
      targetColumn: 0,
      baseDamage: 10,
      totalLpDamage: 5,
      steps: [
        { target: 'frontCard', card: targetCard, damage: 2, effectiveHp: 2, destroyed: true },
        { target: 'playerLp', damage: 5 },
      ],
    } as CombatLogEntry;

    const gs = makeGameState({
      phase: 'AttackPhase',
      transactionLog: [makeAttackEntry(combat, 0)],
    });
    producer.onTurnResult({
      preState: makeGameState(),
      postState: gs,
      action: gs.transactionLog![0].action,
    } as PhalanxTurnResult);

    const events = enqueued.map((e) => e.event);
    expect(events).toContainEqual({
      type: 'attack',
      attacker: 'King♥',
      target: 'Two♠',
      damage: 2,
    });
    expect(events).toContainEqual({ type: 'destroyed', card: 'Two♠' });
    expect(events).toContainEqual({ type: 'lp-damage', player: 'Bot', damage: 5 });
  });

  it('suppresses zero-damage steps with no bonus', () => {
    producer.onTurnResult({
      preState: makeGameState(),
      postState: makeGameState(),
      action: { type: 'pass', playerIndex: 0, timestamp: new Date().toISOString() },
    } as PhalanxTurnResult);

    const attackerCard = makeCard('Three', 'clubs', 3);
    const targetCard = makeCard('Five', 'diamonds', 5);
    const combat: CombatLogEntry = {
      turnNumber: 1,
      attackerPlayerIndex: 0,
      attackerCard,
      targetColumn: 0,
      baseDamage: 3,
      totalLpDamage: 0,
      steps: [
        { target: 'frontCard', card: targetCard, damage: 0 },
      ],
    } as CombatLogEntry;

    const gs = makeGameState({
      phase: 'AttackPhase',
      transactionLog: [makeAttackEntry(combat, 0)],
    });
    producer.onTurnResult({
      preState: makeGameState(),
      postState: gs,
      action: gs.transactionLog![0].action,
    } as PhalanxTurnResult);

    const events = enqueued.map((e) => e.event);
    // Should have no attack/damage events — all suppressed
    expect(events.filter((e) => e.type === 'attack')).toHaveLength(0);
  });

  it('generates bonus callout for diamond defense', () => {
    producer.onTurnResult({
      preState: makeGameState(),
      postState: makeGameState(),
      action: { type: 'pass', playerIndex: 0, timestamp: new Date().toISOString() },
    } as PhalanxTurnResult);

    const attackerCard = makeCard('King', 'hearts', 10);
    const targetCard = makeCard('Two', 'diamonds', 2);
    const combat: CombatLogEntry = {
      turnNumber: 1,
      attackerPlayerIndex: 0,
      attackerCard,
      targetColumn: 0,
      baseDamage: 10,
      totalLpDamage: 0,
      steps: [
        {
          target: 'frontCard',
          card: targetCard,
          incomingDamage: 10,
          damage: 5,
          effectiveHp: 2,
          destroyed: true,
          bonuses: ['diamondDoubleDefense'],
        },
      ],
    } as CombatLogEntry;

    const gs = makeGameState({
      phase: 'AttackPhase',
      transactionLog: [makeAttackEntry(combat, 0)],
    });
    producer.onTurnResult({
      preState: makeGameState(),
      postState: gs,
      action: gs.transactionLog![0].action,
    } as PhalanxTurnResult);

    const bonusEvents = enqueued.filter((e) => e.event.type === 'bonus');
    expect(bonusEvents).toHaveLength(1);
    expect(bonusEvents[0].event).toMatchObject({
      type: 'bonus',
      bonus: 'diamondDoubleDefense',
      message: expect.stringContaining('Diamond Defense'),
    });
  });

  it('generates ace invulnerable callout', () => {
    producer.onTurnResult({
      preState: makeGameState(),
      postState: makeGameState(),
      action: { type: 'pass', playerIndex: 0, timestamp: new Date().toISOString() },
    } as PhalanxTurnResult);

    const attackerCard = makeCard('King', 'hearts', 10);
    const targetCard = makeCard('Ace', 'diamonds', 11);
    const combat: CombatLogEntry = {
      turnNumber: 1,
      attackerPlayerIndex: 0,
      attackerCard,
      targetColumn: 0,
      baseDamage: 10,
      totalLpDamage: 0,
      steps: [
        {
          target: 'frontCard',
          card: targetCard,
          damage: 0,
          bonuses: ['aceInvulnerable'],
        },
      ],
    } as CombatLogEntry;

    const gs = makeGameState({
      phase: 'AttackPhase',
      transactionLog: [makeAttackEntry(combat, 0)],
    });
    producer.onTurnResult({
      preState: makeGameState(),
      postState: gs,
      action: gs.transactionLog![0].action,
    } as PhalanxTurnResult);

    const bonusEvents = enqueued.filter((e) => e.event.type === 'bonus');
    expect(bonusEvents).toHaveLength(1);
    expect(bonusEvents[0].event).toMatchObject({
      type: 'bonus',
      bonus: 'aceInvulnerable',
      message: expect.stringContaining('invulnerable'),
    });
  });

  it('generates phase-change event', () => {
    producer.onTurnResult({
      preState: makeGameState({ phase: 'DeploymentPhase' }),
      postState: makeGameState({ phase: 'DeploymentPhase' }),
      action: { type: 'pass', playerIndex: 0, timestamp: new Date().toISOString() },
    } as PhalanxTurnResult);

    producer.onTurnResult({
      preState: makeGameState({ phase: 'DeploymentPhase' }),
      postState: makeGameState({ phase: 'AttackPhase' }),
      action: { type: 'pass', playerIndex: 0, timestamp: new Date().toISOString() },
    } as PhalanxTurnResult);

    const phaseEvents = enqueued.filter((e) => e.event.type === 'phase-change');
    expect(phaseEvents).toHaveLength(1);
    expect(phaseEvents[0].event).toEqual({ type: 'phase-change', phase: 'AttackPhase' });
  });
});
```

#### Step 2: Run test to verify it fails

Run: `pnpm --filter @phalanxduel/client test -- --run narration-producer`
Expected: FAIL — module not found

#### Step 3: Write minimal implementation

Create `client/src/narration-producer.ts`:

```typescript
import type { PhalanxTurnResult, CombatLogEntry, CombatLogStep, Card } from '@phalanxduel/shared';
import type { NarrationBus, NarrationEntry, NarrationEvent } from './narration-bus';
import { cardLabel } from './cards';

/** Timing constants (ms) */
const DELAY_ATTACK = 800;
const DELAY_DESTROYED = 400;
const DELAY_OVERFLOW = 600;
const DELAY_DEPLOY = 600;
const DELAY_BONUS = 500;
const DELAY_PHASE = 400;

const BONUS_MESSAGES: Record<string, (card: string) => string> = {
  aceInvulnerable: (card) => `${card} is invulnerable`,
  aceVsAce: (card) => `${card} breaks through invulnerability`,
  diamondDoubleDefense: () => `...halved by Diamond Defense`,
  diamondDeathShield: () => `Heart Death Shield absorbs the blow`,
  clubDoubleOverflow: () => `...doubled by Club Overflow`,
  spadeDoubleLp: () => `...strikes directly`,
};

export class NarrationProducer {
  private lastLogCount = 0;
  private lastPhase: string | null = null;
  private initialized = false;

  constructor(private bus: NarrationBus) {}

  onTurnResult(result: PhalanxTurnResult): void {
    const { postState } = result;
    const log = postState.transactionLog ?? [];

    if (!this.initialized) {
      this.lastLogCount = log.length;
      this.lastPhase = postState.phase;
      this.initialized = true;
      return;
    }

    const entries: NarrationEntry[] = [];

    // Phase change
    if (postState.phase !== this.lastPhase) {
      entries.push({
        event: { type: 'phase-change', phase: postState.phase },
        delayMs: DELAY_PHASE,
      });
      this.lastPhase = postState.phase;
    }

    // New transaction log entries
    if (log.length > this.lastLogCount) {
      const newEntries = log.slice(this.lastLogCount);
      for (const entry of newEntries) {
        const playerIndex = entry.action.playerIndex;
        const playerName = postState.players[playerIndex]?.player.name ?? 'Unknown';

        if (entry.details.type === 'deploy') {
          const card = this.resolveDeployCard(entry);
          entries.push({
            event: { type: 'deploy', player: playerName, card },
            delayMs: DELAY_DEPLOY,
          });
        } else if (entry.details.type === 'pass') {
          entries.push({
            event: { type: 'pass', player: playerName, phase: postState.phase },
            delayMs: DELAY_DEPLOY,
          });
        } else if (entry.details.type === 'attack') {
          entries.push(...this.buildCombatNarration(entry.details.combat, postState));
        }
      }
      this.lastLogCount = log.length;
    }

    if (entries.length > 0) {
      this.bus.enqueue(entries);
    }
  }

  private resolveDeployCard(entry: { action: { cardId?: string } }): string {
    // The card label comes from the action's cardId, but we need the full
    // card object. Since we can't easily look it up post-deploy (it moved
    // from hand to battlefield), we use the cardId which encodes face-suit.
    const cardId = (entry.action as { cardId?: string }).cardId ?? '?';
    // cardId format: "{face}-{suit}" e.g. "Ace-spades"
    const parts = cardId.split('-');
    if (parts.length === 2) {
      const [face, suit] = parts;
      return cardLabel({ face, suit } as Card);
    }
    return cardId;
  }

  private buildCombatNarration(
    combat: CombatLogEntry,
    postState: PhalanxTurnResult['postState'],
  ): NarrationEntry[] {
    const entries: NarrationEntry[] = [];
    const attacker = cardLabel(combat.attackerCard);
    const defenderIdx = combat.attackerPlayerIndex === 0 ? 1 : 0;
    const defenderName = postState.players[defenderIdx]?.player.name ?? 'Opponent';

    for (const step of combat.steps) {
      // Check for bonus-only events (ace invulnerable, etc.)
      if (step.damage === 0 && step.bonuses?.length) {
        for (const bonus of step.bonuses) {
          const msgFn = BONUS_MESSAGES[bonus];
          if (msgFn) {
            const card = step.card ? cardLabel(step.card) : attacker;
            entries.push({
              event: { type: 'bonus', bonus, card, message: msgFn(card) },
              delayMs: DELAY_BONUS,
            });
          }
        }
        continue;
      }

      // Suppress zero-damage steps with no bonuses
      if (step.damage === 0) continue;

      if (step.target === 'playerLp') {
        entries.push({
          event: { type: 'lp-damage', player: defenderName, damage: step.damage },
          delayMs: DELAY_ATTACK,
        });
      } else {
        const target = step.card ? cardLabel(step.card) : `column ${combat.targetColumn + 1}`;
        const isOverflow = step.target === 'backCard';

        if (isOverflow) {
          entries.push({
            event: { type: 'overflow', target, damage: step.damage },
            delayMs: DELAY_OVERFLOW,
          });
        } else {
          entries.push({
            event: { type: 'attack', attacker, target, damage: step.damage },
            delayMs: DELAY_ATTACK,
          });
        }

        // Bonus callouts for non-zero damage
        if (step.bonuses?.length) {
          for (const bonus of step.bonuses) {
            const msgFn = BONUS_MESSAGES[bonus];
            if (msgFn) {
              const card = step.card ? cardLabel(step.card) : attacker;
              entries.push({
                event: { type: 'bonus', bonus, card, message: msgFn(card) },
                delayMs: DELAY_BONUS,
              });
            }
          }
        }

        if (step.destroyed) {
          entries.push({
            event: { type: 'destroyed', card: step.card ? cardLabel(step.card) : target },
            delayMs: DELAY_DESTROYED,
          });
        }
      }
    }

    return entries;
  }
}
```

#### Step 4: Run test to verify it passes

Run: `pnpm --filter @phalanxduel/client test -- --run narration-producer`
Expected: 8 tests PASS

#### Step 5: Commit

```bash
git add client/src/narration-producer.ts client/tests/narration-producer.test.ts
git commit -m "feat(client): add NarrationProducer for transaction log diffing"
```

---

## Task 3: Center Overlay Consumer

**Files:**

- Create: `client/src/narration-overlay.ts`
- Modify: `client/src/style.css` (append narration CSS)
- Test: Manual visual testing (DOM rendering with animations)

#### Step 1: Write implementation

Create `client/src/narration-overlay.ts`:

```typescript
import type { NarrationBus, NarrationEvent } from './narration-bus';

/**
 * Center overlay consumer — dramatic, fading combat narration.
 * Builds text line-by-line, then fades the whole block out.
 */
export class NarrationOverlay {
  private container: HTMLElement | null = null;
  private fadeTimer: ReturnType<typeof setTimeout> | null = null;
  private unsub: (() => void) | null = null;
  private reducedMotion: boolean;

  constructor(private bus: NarrationBus) {
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  start(): void {
    this.unsub = this.bus.subscribe((event) => this.onEvent(event));
  }

  destroy(): void {
    this.unsub?.();
    this.clearContainer();
  }

  private onEvent(event: NarrationEvent): void {
    const text = this.formatEvent(event);
    if (!text) return;

    const container = this.ensureContainer();
    this.resetFadeTimer();

    const line = document.createElement('div');
    line.className = this.getLineClass(event);
    line.textContent = text;

    if (!this.reducedMotion) {
      line.classList.add('nr-line-enter');
    }

    container.appendChild(line);

    // Auto-fade after last event
    this.fadeTimer = setTimeout(() => {
      container.classList.add('nr-fade-out');
      setTimeout(() => this.clearContainer(), 600);
    }, 1200);
  }

  private formatEvent(event: NarrationEvent): string | null {
    switch (event.type) {
      case 'deploy':
        return `${event.player} deploys ${event.card}`;
      case 'attack':
        return `${event.attacker} attacks ${event.target} for ${event.damage} damage`;
      case 'destroyed':
        return 'DESTROYED';
      case 'overflow':
        return `${event.damage} damage carries to ${event.target}`;
      case 'lp-damage':
        return `${event.damage} damage to ${event.player}`;
      case 'pass':
        return `${event.player} passes`;
      case 'bonus':
        return event.message;
      case 'phase-change':
        return null; // Handled by Pizzazz phase splash
    }
  }

  private getLineClass(event: NarrationEvent): string {
    const base = 'nr-overlay-line';
    if (event.type === 'destroyed') return `${base} nr-destroyed`;
    if (event.type === 'lp-damage') return `${base} nr-lp-hit`;
    if (event.type === 'bonus') return `${base} nr-bonus`;
    return base;
  }

  private ensureContainer(): HTMLElement {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'nr-overlay';
      this.container.setAttribute('aria-hidden', 'true');
      document.body.appendChild(this.container);
    }
    return this.container;
  }

  private clearContainer(): void {
    if (this.fadeTimer) {
      clearTimeout(this.fadeTimer);
      this.fadeTimer = null;
    }
    this.container?.remove();
    this.container = null;
  }

  private resetFadeTimer(): void {
    if (this.fadeTimer) {
      clearTimeout(this.fadeTimer);
      this.fadeTimer = null;
    }
    // Remove fade-out class if present (new events arrived)
    this.container?.classList.remove('nr-fade-out');
  }
}
```

#### Step 2: Add CSS to `client/src/style.css`

Append to the end of the file (before any `@media` queries for reduced motion — add the narration reduced-motion rule inside the existing `prefers-reduced-motion` block):

```css
/* ── Narration Overlay ─────────────────────────── */

.nr-overlay {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 3500;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  transition: opacity 0.6s ease-out;
}

.nr-overlay.nr-fade-out {
  opacity: 0;
}

.nr-overlay-line {
  font-family: var(--font-display, 'Georgia', serif);
  font-size: 1.1rem;
  color: var(--text);
  text-shadow: 0 0 12px rgba(0, 0, 0, 0.8);
  white-space: nowrap;
}

.nr-overlay-line.nr-destroyed {
  font-size: 1.4rem;
  font-weight: bold;
  color: var(--red-bright);
  text-transform: uppercase;
}

.nr-overlay-line.nr-lp-hit {
  color: var(--gold-bright);
  font-weight: bold;
}

.nr-overlay-line.nr-bonus {
  font-style: italic;
  color: var(--gold);
  font-size: 0.95rem;
}

@keyframes nr-line-enter {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.nr-line-enter {
  animation: nr-line-enter 0.3s ease-out forwards;
}

/* ── Narration Ticker ──────────────────────────── */

.nr-ticker {
  position: fixed;
  left: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  z-index: 2500;
  width: 200px;
  max-height: 40vh;
  overflow-y: auto;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  scrollbar-width: none;
}

.nr-ticker::-webkit-scrollbar {
  display: none;
}

.nr-ticker-line {
  font-size: 0.75rem;
  color: var(--text-muted);
  background: rgba(11, 9, 6, 0.7);
  padding: 0.15rem 0.4rem;
  border-radius: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nr-ticker-line.nr-ticker-destroyed {
  color: var(--red-bright);
  font-weight: bold;
}

.nr-ticker-line.nr-ticker-lp {
  color: var(--gold);
}

.nr-ticker-line.nr-ticker-bonus {
  font-style: italic;
  color: var(--gold-dim);
}

.nr-ticker-line.nr-ticker-phase {
  color: var(--gold-bright);
  font-weight: bold;
  text-transform: uppercase;
  font-size: 0.7rem;
}

@keyframes nr-ticker-enter {
  from {
    opacity: 0;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.nr-ticker-enter {
  animation: nr-ticker-enter 0.2s ease-out forwards;
}

/* Responsive: hide ticker on small screens */
@media (max-width: 768px) {
  .nr-ticker {
    display: none;
  }

  .nr-overlay-line {
    font-size: 0.9rem;
  }

  .nr-overlay-line.nr-destroyed {
    font-size: 1.1rem;
  }
}
```

Also add to the existing `prefers-reduced-motion` block (around line 1694):

```css
  .nr-line-enter,
  .nr-ticker-enter {
    animation: none;
  }
```

#### Step 3: Run build to verify CSS compiles

Run: `pnpm --filter @phalanxduel/client build`
Expected: Build succeeds

#### Step 4: Commit

```bash
git add client/src/narration-overlay.ts client/src/style.css
git commit -m "feat(client): add center overlay narration consumer with CSS"
```

---

## Task 4: Left-Side Ticker Consumer

**Files:**

- Create: `client/src/narration-ticker.ts`
- Test: Manual visual testing

#### Step 1: Write implementation

Create `client/src/narration-ticker.ts`:

```typescript
import type { NarrationBus, NarrationEvent } from './narration-bus';

const PHASE_LABELS: Record<string, string> = {
  DeploymentPhase: 'DEPLOYMENT',
  AttackPhase: 'BATTLE',
  ReinforcementPhase: 'REINFORCEMENT',
  gameOver: 'GAME OVER',
};

const MAX_LINES = 30;

/**
 * Left-side ticker consumer — persistent combat feed with a11y.
 * `role="log"` + `aria-live="polite"` for screen readers.
 */
export class NarrationTicker {
  private container: HTMLElement | null = null;
  private unsub: (() => void) | null = null;
  private lineCount = 0;
  private reducedMotion: boolean;

  constructor(private bus: NarrationBus) {
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  start(): void {
    this.unsub = this.bus.subscribe((event) => this.onEvent(event));
  }

  destroy(): void {
    this.unsub?.();
    this.container?.remove();
    this.container = null;
    this.lineCount = 0;
  }

  private onEvent(event: NarrationEvent): void {
    const text = this.formatEvent(event);
    if (!text) return;

    const container = this.ensureContainer();

    const line = document.createElement('div');
    line.className = this.getLineClass(event);
    line.textContent = text;

    if (!this.reducedMotion) {
      line.classList.add('nr-ticker-enter');
    }

    container.appendChild(line);
    this.lineCount++;

    // Prune old lines
    while (this.lineCount > MAX_LINES && container.firstChild) {
      container.removeChild(container.firstChild);
      this.lineCount--;
    }

    // Auto-scroll to bottom
    container.scrollTop = container.scrollHeight;
  }

  private formatEvent(event: NarrationEvent): string | null {
    switch (event.type) {
      case 'deploy':
        return `${event.player} deploys ${event.card}`;
      case 'attack':
        return `${event.attacker} → ${event.target} (${event.damage})`;
      case 'destroyed':
        return `DESTROYED`;
      case 'overflow':
        return `↪ ${event.target} (${event.damage})`;
      case 'lp-damage':
        return `${event.damage} dmg → ${event.player}`;
      case 'pass':
        return `${event.player} passes`;
      case 'bonus':
        return event.message;
      case 'phase-change': {
        const label = PHASE_LABELS[event.phase] ?? event.phase;
        return `── ${label} ──`;
      }
    }
  }

  private getLineClass(event: NarrationEvent): string {
    const base = 'nr-ticker-line';
    if (event.type === 'destroyed') return `${base} nr-ticker-destroyed`;
    if (event.type === 'lp-damage') return `${base} nr-ticker-lp`;
    if (event.type === 'bonus') return `${base} nr-ticker-bonus`;
    if (event.type === 'phase-change') return `${base} nr-ticker-phase`;
    return base;
  }

  private ensureContainer(): HTMLElement {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'nr-ticker';
      this.container.setAttribute('role', 'log');
      this.container.setAttribute('aria-live', 'polite');
      this.container.setAttribute('aria-label', 'Combat narration');
      document.body.appendChild(this.container);
    }
    return this.container;
  }
}
```

#### Step 2: Run build to verify it compiles

Run: `pnpm --filter @phalanxduel/client build`
Expected: Build succeeds

#### Step 3: Commit

```bash
git add client/src/narration-ticker.ts
git commit -m "feat(client): add left-side ticker narration consumer with a11y"
```

---

## Task 5: Wire Narration System Into Game & Disable Pizzazz Announcer

**Files:**

- Modify: `client/src/game.ts` — import and initialize narration system
- Modify: `client/src/game-preact.tsx` — same for Preact path
- Modify: `client/src/pizzazz.ts` — disable `showCombatAnnouncer`, skip 0-damage pops
- Modify: `client/src/state.ts` — add narration callback alongside turnResultCallback

#### Step 1: Update `state.ts` to support multiple turn result callbacks

In `client/src/state.ts`, change the single callback to an array:

Replace (lines 123-129):

```typescript
// Side-channel for PizzazzEngine: receives full turn result before state update
type TurnResultCallback = (result: PhalanxTurnResult) => void;
let turnResultCallback: TurnResultCallback | null = null;

export function onTurnResult(cb: TurnResultCallback): void {
  turnResultCallback = cb;
}
```

With:

```typescript
// Side-channel for PizzazzEngine + NarrationProducer
type TurnResultCallback = (result: PhalanxTurnResult) => void;
const turnResultCallbacks: TurnResultCallback[] = [];

export function onTurnResult(cb: TurnResultCallback): () => void {
  turnResultCallbacks.push(cb);
  return () => {
    const idx = turnResultCallbacks.indexOf(cb);
    if (idx !== -1) turnResultCallbacks.splice(idx, 1);
  };
}
```

And update the dispatch call (line 177):

Replace: `turnResultCallback?.(message.result);`
With: `for (const cb of turnResultCallbacks) cb(message.result);`

#### Step 2: Update Pizzazz registration

Find where `onTurnResult` is called to register Pizzazz (search for `onTurnResult` usage in game.ts or renderer.ts) and update to use the returned unsubscribe function if needed. The existing call likely looks like:

```typescript
onTurnResult((result) => pizzazz.onTurnResult(result));
```

This still works — the new signature is backward-compatible (just adds a return value).

#### Step 3: Disable Pizzazz combat announcer

In `client/src/pizzazz.ts`, modify `onCombat` (line 90-98) to skip the announcer:

Replace:

```typescript
  private onCombat(combat: CombatLogEntry): void {
    this.showCombatAnnouncer(combat);

    if (combat.totalLpDamage > 0) {
      this.triggerScreenShake();
    }

    this.showDamagePops(combat);
  }
```

With:

```typescript
  private onCombat(combat: CombatLogEntry): void {
    // Combat announcer replaced by NarrationOverlay

    if (combat.totalLpDamage > 0) {
      this.triggerScreenShake();
    }

    this.showDamagePops(combat);
  }
```

#### Step 4: Skip 0-damage pops in Pizzazz

In `showDamagePops` (line 148), add early skip:

Replace:

```typescript
    combat.steps.forEach((step, idx) => {
      setTimeout(() => {
```

With:

```typescript
    combat.steps.filter((s) => s.damage > 0).forEach((step, idx) => {
      setTimeout(() => {
```

#### Step 5: Wire narration into game initialization

Find where PizzazzEngine is created in `client/src/game.ts` (or wherever the game screen initializes). Add narration setup nearby.

Add imports at top of game.ts:

```typescript
import { NarrationBus } from './narration-bus';
import { NarrationProducer } from './narration-producer';
import { NarrationOverlay } from './narration-overlay';
import { NarrationTicker } from './narration-ticker';
```

Create a module-level narration instance (similar to how Pizzazz is managed). Near where PizzazzEngine is instantiated, add:

```typescript
let narrationBus: NarrationBus | null = null;

function initNarration(): void {
  narrationBus?.destroy();
  narrationBus = new NarrationBus();

  const producer = new NarrationProducer(narrationBus);
  const overlay = new NarrationOverlay(narrationBus);
  const ticker = new NarrationTicker(narrationBus);

  overlay.start();
  ticker.start();

  onTurnResult((result) => producer.onTurnResult(result));
}
```

Call `initNarration()` where PizzazzEngine is initialized (same lifecycle point).

Do the same for `game-preact.tsx` if it has a separate Pizzazz init path.

#### Step 6: Run all tests

Run: `pnpm -r test`
Expected: All tests pass (narration is additive, no breaking changes)

#### Step 7: Commit

```bash
git add client/src/state.ts client/src/pizzazz.ts client/src/game.ts client/src/game-preact.tsx
git commit -m "feat(client): wire narration bus, disable Pizzazz announcer, skip 0-dmg pops"
```

---

## Task 6: Visual QA & Tuning

**Files:**

- Possibly modify: `client/src/narration-producer.ts` (timing), `client/src/style.css` (positioning)

#### Step 1: Start local dev server

Run: `pnpm dev`

#### Step 2: Play a bot game

Navigate to `http://localhost:5173`, create a match vs bot. Observe:

- [ ] Center overlay shows step-by-step narration during attacks
- [ ] "DESTROYED" appears in red when cards die
- [ ] Bonus callouts appear (play enough turns to trigger diamond/ace combos)
- [ ] Deployment phase shows "Mike deploys Ace♠" style messages
- [ ] Left ticker accumulates lines and auto-scrolls
- [ ] 0-damage steps are suppressed (no "0 damage" noise)
- [ ] Pizzazz damage pops still appear for non-zero damage
- [ ] Screen shake still fires on LP damage
- [ ] Phase splash still shows
- [ ] Overlay fades out after narration completes

#### Step 3: Test reduced motion

In browser DevTools → Rendering → Emulate CSS media: `prefers-reduced-motion: reduce`

- [ ] No animations on overlay or ticker
- [ ] Text still appears and disappears

#### Step 4: Test screen reader

- [ ] Ticker has `role="log"` and `aria-live="polite"` in DOM
- [ ] Center overlay has `aria-hidden="true"`

#### Step 5: Adjust timing if needed

Tune `DELAY_ATTACK`, `DELAY_DESTROYED`, etc. in `narration-producer.ts` based on feel.

#### Step 6: Commit any tuning changes

```bash
git add -u
git commit -m "fix(client): tune narration timing and styles from QA"
```

---

## Task 7: Run Full CI & Cleanup

#### Step 1: Run full test suite

Run: `pnpm -r test`
Expected: All tests pass

#### Step 2: Run typecheck

Run: `pnpm typecheck`
Expected: No errors

#### Step 3: Run lint

Run: `pnpm lint`
Expected: Clean

#### Step 4: Run format check

Run: `pnpm format:check`
Expected: Clean

#### Step 5: Final commit if any cleanup needed

```bash
git add -u
git commit -m "chore(client): narration bus cleanup"
```
