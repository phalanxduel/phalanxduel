/**
 * PHX-EV-001: Engine event derivation — deriveEventsFromEntry
 *
 * Two levels of coverage:
 *  1. Unit tests — mock/minimal entries exercise each branch in isolation.
 *  2. Integration tests — real games driven by computeBotAction to
 *     gameOver, verifying every TransactionLogEntry in the live log
 *     produces schema-valid, deterministic events. This proves the function
 *     works on actual engine output, not just hand-crafted fixtures.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import {
  deriveEventsFromEntry,
  replayGame,
  createInitialState,
  applyAction,
  computeBotAction,
} from '../src/index.ts';
import type { GameState, TransactionLogEntry, PhalanxEvent } from '@phalanxduel/shared';
import { PhalanxEventSchema, TelemetryName } from '@phalanxduel/shared';
import { computeStateHash } from '@phalanxduel/shared/hash';

const MATCH_ID = 'test-match-id';
const TIMESTAMP = '2026-01-01T00:00:00.000Z';

const testConfig = {
  matchId: MATCH_ID,
  players: [
    { id: '00000000-0000-0000-0000-000000000001', name: 'Alice' },
    { id: '00000000-0000-0000-0000-000000000002', name: 'Bob' },
  ],
  rngSeed: 42,
  drawTimestamp: TIMESTAMP,
};

// --- Shared real entries from replayGame ---

function getInitEntry(): TransactionLogEntry {
  const result = replayGame(testConfig, []);
  const entry = result.finalState.transactionLog?.[0];
  if (!entry) throw new Error('Expected transactionLog[0]');
  return entry;
}

function getDeployEntry(): TransactionLogEntry {
  const initial = replayGame(testConfig, []).finalState;
  // P2 (index 1) deploys first in strict classic mode
  const cardId = initial.players[1]!.hand[0]!.id;
  const result = replayGame(testConfig, [
    { type: 'deploy', playerIndex: 1, column: 0, cardId, timestamp: TIMESTAMP },
  ]);
  const entry = result.finalState.transactionLog?.[1];
  if (!entry) throw new Error('Expected transactionLog[1]');
  return entry;
}

// --- Mock entries for attack / pass / reinforce / forfeit ---

const mockAttackEntry: TransactionLogEntry = {
  sequenceNumber: 5,
  action: {
    type: 'attack',
    playerIndex: 0,
    attackingColumn: 0,
    defendingColumn: 0,
    timestamp: TIMESTAMP,
  },
  stateHashBefore: '',
  stateHashAfter: '',
  timestamp: TIMESTAMP,
  phaseTrace: [
    { from: 'AttackPhase', trigger: 'attack', to: 'AttackResolution' },
    { from: 'AttackResolution', trigger: 'system:advance', to: 'CleanupPhase' },
  ],
  details: {
    type: 'attack',
    combat: {
      turnNumber: 1,
      attackerPlayerIndex: 0,
      attackerCard: { id: 'card-atk', suit: 'spades', face: '5', value: 5, type: 'number' },
      targetColumn: 0,
      baseDamage: 5,
      totalLpDamage: 0,
      steps: [
        {
          target: 'frontCard',
          card: { id: 'card-def', suit: 'hearts', face: '3', value: 3, type: 'number' },
          damage: 3,
          hpBefore: 3,
          hpAfter: 0,
          destroyed: true,
          bonuses: [],
        },
        {
          target: 'backCard',
          card: { id: 'card-def2', suit: 'clubs', face: '2', value: 2, type: 'number' },
          damage: 2,
          hpBefore: 2,
          hpAfter: 0,
          destroyed: true,
        },
      ],
    },
    reinforcementTriggered: false,
    victoryTriggered: false,
  },
};

const mockPassEntry: TransactionLogEntry = {
  sequenceNumber: 2,
  action: { type: 'pass', playerIndex: 0, timestamp: TIMESTAMP },
  stateHashBefore: '',
  stateHashAfter: '',
  timestamp: TIMESTAMP,
  phaseTrace: [
    { from: 'AttackPhase', trigger: 'pass', to: 'AttackResolution' },
    { from: 'AttackResolution', trigger: 'system:advance', to: 'CleanupPhase' },
  ],
  details: { type: 'pass' },
};

const mockReinforceEntry: TransactionLogEntry = {
  sequenceNumber: 3,
  action: { type: 'reinforce', playerIndex: 1, cardId: 'card-r', timestamp: TIMESTAMP },
  stateHashBefore: '',
  stateHashAfter: '',
  timestamp: TIMESTAMP,
  phaseTrace: [
    { from: 'ReinforcementPhase', trigger: 'reinforce', to: 'ReinforcementPhase' },
    { from: 'ReinforcementPhase', trigger: 'reinforce:complete', to: 'DrawPhase' },
  ],
  details: {
    type: 'reinforce',
    column: 1,
    gridIndex: 5,
    cardsDrawn: 1,
    reinforcementComplete: true,
  },
};

const mockForfeitEntry: TransactionLogEntry = {
  sequenceNumber: 4,
  action: { type: 'forfeit', playerIndex: 1, timestamp: TIMESTAMP },
  stateHashBefore: '',
  stateHashAfter: '',
  timestamp: TIMESTAMP,
  phaseTrace: [{ from: 'AttackPhase', trigger: 'forfeit', to: 'gameOver' }],
  details: { type: 'forfeit', winnerIndex: 0 },
};

// --- Helpers ---

function allEventsValid(events: ReturnType<typeof deriveEventsFromEntry>): boolean {
  return events.every((ev) => {
    const result = PhalanxEventSchema.safeParse(ev);
    return result.success;
  });
}

// --- Tests ---

describe('PHX-EV-001: deriveEventsFromEntry', () => {
  describe('AC #4 + #1: deterministic IDs and function signature', () => {
    it('assigns IDs following ${matchId}:seq${seqNum}:ev${index} pattern', () => {
      const events = deriveEventsFromEntry(mockPassEntry, MATCH_ID);
      expect(events.length).toBeGreaterThan(0);
      events.forEach((ev, i) => {
        expect(ev.id).toBe(`${MATCH_ID}:seq2:ev${i}`);
      });
    });
  });

  describe('AC #6: determinism', () => {
    it('produces byte-identical results when called twice with the same entry', () => {
      const first = deriveEventsFromEntry(mockAttackEntry, MATCH_ID);
      const second = deriveEventsFromEntry(mockAttackEntry, MATCH_ID);
      expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    });

    it('produces byte-identical results for a real replay entry', () => {
      const entry = getInitEntry();
      const first = deriveEventsFromEntry(entry, MATCH_ID);
      const second = deriveEventsFromEntry(entry, MATCH_ID);
      expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    });
  });

  describe('AC #7: schema validity', () => {
    it('all events from system:init pass PhalanxEventSchema', () => {
      const entry = getInitEntry();
      const events = deriveEventsFromEntry(entry, MATCH_ID);
      expect(events.length).toBeGreaterThan(0);
      expect(allEventsValid(events)).toBe(true);
    });

    it('all events from deploy pass PhalanxEventSchema', () => {
      const entry = getDeployEntry();
      const events = deriveEventsFromEntry(entry, MATCH_ID);
      expect(events.length).toBeGreaterThan(0);
      expect(allEventsValid(events)).toBe(true);
    });

    it('all events from attack pass PhalanxEventSchema', () => {
      const events = deriveEventsFromEntry(mockAttackEntry, MATCH_ID);
      expect(events.length).toBeGreaterThan(0);
      expect(allEventsValid(events)).toBe(true);
    });

    it('all events from pass pass PhalanxEventSchema', () => {
      const events = deriveEventsFromEntry(mockPassEntry, MATCH_ID);
      expect(allEventsValid(events)).toBe(true);
    });

    it('all events from reinforce pass PhalanxEventSchema', () => {
      const events = deriveEventsFromEntry(mockReinforceEntry, MATCH_ID);
      expect(allEventsValid(events)).toBe(true);
    });

    it('all events from forfeit pass PhalanxEventSchema', () => {
      const events = deriveEventsFromEntry(mockForfeitEntry, MATCH_ID);
      expect(allEventsValid(events)).toBe(true);
    });
  });

  describe('AC #5: TelemetryName constants (no freehand strings)', () => {
    it('uses TelemetryName.EVENT_PHASE_START for span_started events', () => {
      const events = deriveEventsFromEntry(mockPassEntry, MATCH_ID);
      const started = events.filter((e) => e.type === 'span_started');
      expect(started.length).toBeGreaterThan(0);
      started.forEach((e) => {
        expect(e.name).toBe(TelemetryName.EVENT_PHASE_START);
      });
    });

    it('uses TelemetryName.EVENT_PHASE_END for span_ended events', () => {
      const events = deriveEventsFromEntry(mockPassEntry, MATCH_ID);
      const ended = events.filter((e) => e.type === 'span_ended');
      expect(ended.length).toBe(mockPassEntry.phaseTrace!.length);
      ended.forEach((e) => {
        expect(e.name).toBe(TelemetryName.EVENT_PHASE_END);
      });
    });

    it('uses TelemetryName.EVENT_INIT for system:init functional_update', () => {
      const entry = getInitEntry();
      const events = deriveEventsFromEntry(entry, MATCH_ID);
      const updates = events.filter((e) => e.type === 'functional_update');
      expect(updates.length).toBeGreaterThan(0);
      updates.forEach((e) => {
        expect(e.name).toBe(TelemetryName.EVENT_INIT);
      });
    });

    it('uses TelemetryName.EVENT_DEPLOY for deploy functional_update', () => {
      const entry = getDeployEntry();
      const events = deriveEventsFromEntry(entry, MATCH_ID);
      const updates = events.filter((e) => e.type === 'functional_update');
      expect(updates.length).toBe(1);
      expect(updates[0]!.name).toBe(TelemetryName.EVENT_DEPLOY);
    });

    it('uses TelemetryName.EVENT_COMBAT_STEP for attack functional_updates', () => {
      const events = deriveEventsFromEntry(mockAttackEntry, MATCH_ID);
      const updates = events.filter((e) => e.type === 'functional_update');
      updates.forEach((e) => {
        expect(e.name).toBe(TelemetryName.EVENT_COMBAT_STEP);
      });
    });

    it('uses TelemetryName.EVENT_PASS for pass functional_update', () => {
      const events = deriveEventsFromEntry(mockPassEntry, MATCH_ID);
      const updates = events.filter((e) => e.type === 'functional_update');
      expect(updates.length).toBe(1);
      expect(updates[0]!.name).toBe(TelemetryName.EVENT_PASS);
    });

    it('uses TelemetryName.EVENT_REINFORCE for reinforce functional_update', () => {
      const events = deriveEventsFromEntry(mockReinforceEntry, MATCH_ID);
      const updates = events.filter((e) => e.type === 'functional_update');
      expect(updates.length).toBe(1);
      expect(updates[0]!.name).toBe(TelemetryName.EVENT_REINFORCE);
    });

    it('uses TelemetryName.EVENT_FORFEIT for forfeit functional_update', () => {
      const events = deriveEventsFromEntry(mockForfeitEntry, MATCH_ID);
      const updates = events.filter((e) => e.type === 'functional_update');
      expect(updates.length).toBe(1);
      expect(updates[0]!.name).toBe(TelemetryName.EVENT_FORFEIT);
    });
  });

  describe('AC #2: attack action emits spans + one functional_update per CombatLogStep', () => {
    it('emits span_started for each phase hop', () => {
      const events = deriveEventsFromEntry(mockAttackEntry, MATCH_ID);
      const started = events.filter((e) => e.type === 'span_started');
      expect(started.length).toBe(mockAttackEntry.phaseTrace!.length);
    });

    it('emits one functional_update per CombatLogStep', () => {
      const steps = (mockAttackEntry.details as { combat: { steps: unknown[] } }).combat.steps;
      const events = deriveEventsFromEntry(mockAttackEntry, MATCH_ID);
      const updates = events.filter((e) => e.type === 'functional_update');
      expect(updates.length).toBe(steps.length);
    });

    it('includes target, damage, destroyed, and bonuses in combat step payload', () => {
      const events = deriveEventsFromEntry(mockAttackEntry, MATCH_ID);
      const updates = events.filter((e) => e.type === 'functional_update');
      const first = updates[0]!;
      expect(first.payload.target).toBe('frontCard');
      expect(first.payload.damage).toBe(3);
      expect(first.payload.destroyed).toBe(true);
      expect(first.payload.bonuses).toEqual([]);
    });

    it('omits optional fields when undefined (no bonuses on second step)', () => {
      const events = deriveEventsFromEntry(mockAttackEntry, MATCH_ID);
      const updates = events.filter((e) => e.type === 'functional_update');
      const second = updates[1]!;
      expect('bonuses' in second.payload).toBe(false);
    });

    it('emits span_ended for each phase hop', () => {
      const events = deriveEventsFromEntry(mockAttackEntry, MATCH_ID);
      const ended = events.filter((e) => e.type === 'span_ended');
      expect(ended.length).toBe(mockAttackEntry.phaseTrace!.length);
    });
  });

  describe('AC #3: non-attack actions emit functional_update + phase spans', () => {
    it('deploy: emits functional_update with gridIndex and phaseAfter', () => {
      const entry = getDeployEntry();
      const events = deriveEventsFromEntry(entry, MATCH_ID);
      const updates = events.filter((e) => e.type === 'functional_update');
      expect(updates.length).toBe(1);
      expect(typeof updates[0]!.payload.gridIndex).toBe('number');
      expect(typeof updates[0]!.payload.phaseAfter).toBe('string');
    });

    it('pass: emits one span_started and one span_ended per phase hop', () => {
      const events = deriveEventsFromEntry(mockPassEntry, MATCH_ID);
      const started = events.filter((e) => e.type === 'span_started');
      const ended = events.filter((e) => e.type === 'span_ended');
      expect(started.length).toBe(mockPassEntry.phaseTrace!.length);
      expect(ended.length).toBe(mockPassEntry.phaseTrace!.length);
    });

    it('reinforce: emits functional_update with column, gridIndex, cardsDrawn', () => {
      const events = deriveEventsFromEntry(mockReinforceEntry, MATCH_ID);
      const updates = events.filter((e) => e.type === 'functional_update');
      expect(updates.length).toBe(1);
      expect(updates[0]!.payload.column).toBe(1);
      expect(updates[0]!.payload.gridIndex).toBe(5);
      expect(updates[0]!.payload.cardsDrawn).toBe(1);
    });

    it('forfeit: emits functional_update with winnerIndex', () => {
      const events = deriveEventsFromEntry(mockForfeitEntry, MATCH_ID);
      const updates = events.filter((e) => e.type === 'functional_update');
      expect(updates.length).toBe(1);
      expect(updates[0]!.payload.winnerIndex).toBe(0);
    });

    it('system:init: emits functional_update even with no phaseTrace', () => {
      const entry = getInitEntry();
      const events = deriveEventsFromEntry(entry, MATCH_ID);
      const updates = events.filter((e) => e.type === 'functional_update');
      expect(updates.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('timestamp and parentId', () => {
    it('uses entry.timestamp for all events', () => {
      const events = deriveEventsFromEntry(mockPassEntry, MATCH_ID);
      events.forEach((ev) => {
        expect(ev.timestamp).toBe(TIMESTAMP);
      });
    });

    it('span events have turnSpanId as parentId', () => {
      const turnSpanId = `${MATCH_ID}:seq2:turn`;
      const events = deriveEventsFromEntry(mockPassEntry, MATCH_ID);
      const spanEvents = events.filter((e) => e.type === 'span_started' || e.type === 'span_ended');
      spanEvents.forEach((e) => {
        expect(e.parentId).toBe(turnSpanId);
      });
    });

    it('phase spans include a stable spanId payload so starts and ends can be paired', () => {
      const events = deriveEventsFromEntry(mockPassEntry, MATCH_ID);
      const started = events.filter((e) => e.type === 'span_started');
      const ended = events.filter((e) => e.type === 'span_ended');

      expect(started).toHaveLength(mockPassEntry.phaseTrace!.length);
      expect(ended).toHaveLength(mockPassEntry.phaseTrace!.length);

      const startedSpanIds = started.map((e) => e.payload.spanId);
      const endedSpanIds = ended.map((e) => e.payload.spanId);

      expect(startedSpanIds).toEqual([
        `${MATCH_ID}:seq2:turn:phase0`,
        `${MATCH_ID}:seq2:turn:phase1`,
      ]);
      expect(endedSpanIds).toEqual(startedSpanIds);
    });

    it('functional updates attach to the active phase span when a phase trace exists', () => {
      const events = deriveEventsFromEntry(mockPassEntry, MATCH_ID);
      const updates = events.filter((e) => e.type === 'functional_update');
      expect(updates).toHaveLength(1);
      expect(updates[0]!.parentId).toBe(`${MATCH_ID}:seq2:turn:phase0`);
    });
  });
});

// ── Integration: real engine output ─────────────────────────────────────────
//
// Drives two random-strategy bots to gameOver and verifies that
// deriveEventsFromEntry handles every entry in the live transactionLog:
// real resolveAttack output, real CombatLogEntry/Step values, real
// phaseTrace chains, and actual reinforcement triggers.
//
// Multiple seeds are used so that different card layouts and combat paths
// are exercised across runs.

const INTEGRATION_SEEDS = [42, 7, 1337, 99, 256];
const MAX_TURNS = 1000;

function simulateFullGame(seed: number): GameState {
  const matchId = `integ-${seed}`;
  const ts = TIMESTAMP;

  let state = createInitialState({
    matchId,
    players: [
      { id: '00000000-0000-0000-0000-000000000001', name: 'Alice' },
      { id: '00000000-0000-0000-0000-000000000002', name: 'Bob' },
    ],
    rngSeed: seed,
    drawTimestamp: ts,
  });

  state = applyAction(state, { type: 'system:init', timestamp: ts }, { allowSystemInit: true });

  for (let step = 0; step < MAX_TURNS && state.phase !== 'gameOver'; step++) {
    const action = computeBotAction(
      state,
      state.activePlayerIndex,
      { strategy: 'random', seed: seed + step },
      ts,
    );
    state = applyAction(state, action);
  }

  return state;
}

describe('PHX-EV-001 Integration: deriveEventsFromEntry on real engine output', () => {
  // Pre-simulate all games once — shared across all tests in this suite
  const games = new Map<number, GameState>();

  beforeAll(() => {
    for (const seed of INTEGRATION_SEEDS) {
      games.set(seed, simulateFullGame(seed));
    }
  });

  it('all simulated games reach gameOver (simulation harness is valid)', () => {
    for (const [seed, state] of games) {
      expect(state.phase, `seed ${seed} did not reach gameOver`).toBe('gameOver');
    }
  });

  it('every transactionLog entry produces at least one event', () => {
    for (const [seed, state] of games) {
      const log = state.transactionLog ?? [];
      expect(log.length, `seed ${seed}: expected non-empty transactionLog`).toBeGreaterThan(0);
      for (const entry of log) {
        const events = deriveEventsFromEntry(entry, `integ-${seed}`);
        expect(
          events.length,
          `seed ${seed} seq=${entry.sequenceNumber} (${entry.action.type}): no events produced`,
        ).toBeGreaterThan(0);
      }
    }
  });

  it('every derived event passes PhalanxEventSchema.parse() (no silent schema drift)', () => {
    for (const [seed, state] of games) {
      const log = state.transactionLog ?? [];
      for (const entry of log) {
        const events = deriveEventsFromEntry(entry, `integ-${seed}`);
        for (const ev of events) {
          const result = PhalanxEventSchema.safeParse(ev);
          expect(
            result.success,
            `seed ${seed} seq=${entry.sequenceNumber} (${entry.action.type}) event id=${ev.id}: ${
              result.success ? '' : JSON.stringify(result.error.issues)
            }`,
          ).toBe(true);
        }
      }
    }
  });

  it('event IDs are globally unique within each game log', () => {
    for (const [seed, state] of games) {
      const log = state.transactionLog ?? [];
      const seen = new Set<string>();
      for (const entry of log) {
        const events = deriveEventsFromEntry(entry, `integ-${seed}`);
        for (const ev of events) {
          expect(seen.has(ev.id), `seed ${seed}: duplicate event id ${ev.id}`).toBe(false);
          seen.add(ev.id);
        }
      }
    }
  });

  it('derivation is deterministic: identical results on second pass over same log', () => {
    for (const [seed, state] of games) {
      const matchId = `integ-${seed}`;
      const log = state.transactionLog ?? [];
      for (const entry of log) {
        const first = JSON.stringify(deriveEventsFromEntry(entry, matchId));
        const second = JSON.stringify(deriveEventsFromEntry(entry, matchId));
        expect(first, `seed ${seed} seq=${entry.sequenceNumber}: non-deterministic output`).toBe(
          second,
        );
      }
    }
  });

  it('transaction logs cover all expected action types across the seed set', () => {
    const coveredTypes = new Set<string>();
    for (const state of games.values()) {
      for (const entry of state.transactionLog ?? []) {
        coveredTypes.add(entry.action.type);
      }
    }
    const required = ['system:init', 'deploy', 'attack', 'pass'];
    for (const t of required) {
      expect(coveredTypes.has(t), `action type '${t}' never appeared in any simulated game`).toBe(
        true,
      );
    }
  });

  it('attack entries produce one functional_update per real CombatLogStep', () => {
    for (const [seed, state] of games) {
      const attackEntries = (state.transactionLog ?? []).filter((e) => e.action.type === 'attack');
      for (const entry of attackEntries) {
        const details = entry.details as { type: 'attack'; combat: { steps: unknown[] } };
        const events = deriveEventsFromEntry(entry, `integ-${seed}`);
        const updates = events.filter((e) => e.type === 'functional_update');
        const ended = events.filter((e) => e.type === 'span_ended');
        expect(
          updates.length,
          `seed ${seed} seq=${entry.sequenceNumber}: expected ${details.combat.steps.length} updates`,
        ).toBe(details.combat.steps.length);
        expect(
          ended.length,
          `seed ${seed} seq=${entry.sequenceNumber}: expected one span_ended per phase hop`,
        ).toBe(entry.phaseTrace?.length ?? 0);
      }
    }
  });

  it('reinforce entries produce exactly one functional_update when they appear', () => {
    for (const [seed, state] of games) {
      const reinforceEntries = (state.transactionLog ?? []).filter(
        (e) => e.action.type === 'reinforce',
      );
      for (const entry of reinforceEntries) {
        const events = deriveEventsFromEntry(entry, `integ-${seed}`);
        const updates = events.filter((e) => e.type === 'functional_update');
        expect(
          updates.length,
          `seed ${seed} seq=${entry.sequenceNumber}: reinforce should emit 1 update`,
        ).toBe(1);
      }
    }
  });
});

// ── PHX-EV-002: Fingerprint determinism ────────────────────────────────────

describe('PHX-EV-002: fingerprint determinism', () => {
  const SEED = 42;

  function collectEvents(state: GameState): PhalanxEvent[] {
    const matchId = `det-${SEED}`;
    return (state.transactionLog ?? []).flatMap((entry) => deriveEventsFromEntry(entry, matchId));
  }

  function fingerprint(events: PhalanxEvent[]): string {
    return computeStateHash(events);
  }

  it('identical seed produces identical event arrays', () => {
    const stateA = simulateFullGame(SEED);
    const stateB = simulateFullGame(SEED);
    expect(JSON.stringify(collectEvents(stateA))).toBe(JSON.stringify(collectEvents(stateB)));
  });

  it('identical seed produces identical fingerprint', () => {
    const stateA = simulateFullGame(SEED);
    const stateB = simulateFullGame(SEED);
    expect(fingerprint(collectEvents(stateA))).toBe(fingerprint(collectEvents(stateB)));
  });

  it('fingerprint re-derives offline from event array alone (no re-replay)', () => {
    const state = simulateFullGame(SEED);
    const events = collectEvents(state);
    const fp1 = fingerprint(events);
    const fp2 = computeStateHash(events);
    expect(fp1).toBe(fp2);
  });

  it('fingerprint is a 64-char hex string', () => {
    const state = simulateFullGame(SEED);
    const fp = fingerprint(collectEvents(state));
    expect(fp).toMatch(/^[0-9a-f]{64}$/);
  });

  it('different seeds produce different fingerprints', () => {
    const fpA = fingerprint(collectEvents(simulateFullGame(42)));
    const fpB = fingerprint(collectEvents(simulateFullGame(99)));
    expect(fpA).not.toBe(fpB);
  });
});
