/**
 * PHX-EV-001: Engine event derivation — deriveEventsFromEntry
 */
import { describe, it, expect } from 'vitest';
import { deriveEventsFromEntry, replayGame } from '../src/index.ts';
import type { TransactionLogEntry } from '@phalanxduel/shared';
import { PhalanxEventSchema, TelemetryName } from '@phalanxduel/shared';

const MATCH_ID = 'test-match-id';
const TIMESTAMP = '2026-02-24T12:00:00.000Z';

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
      started.forEach((e) => expect(e.name).toBe(TelemetryName.EVENT_PHASE_START));
    });

    it('uses TelemetryName.EVENT_PHASE_END for span_ended events', () => {
      const events = deriveEventsFromEntry(mockPassEntry, MATCH_ID);
      const ended = events.filter((e) => e.type === 'span_ended');
      expect(ended.length).toBe(1);
      ended.forEach((e) => expect(e.name).toBe(TelemetryName.EVENT_PHASE_END));
    });

    it('uses TelemetryName.EVENT_INIT for system:init functional_update', () => {
      const entry = getInitEntry();
      const events = deriveEventsFromEntry(entry, MATCH_ID);
      const updates = events.filter((e) => e.type === 'functional_update');
      expect(updates.length).toBeGreaterThan(0);
      updates.forEach((e) => expect(e.name).toBe(TelemetryName.EVENT_INIT));
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
      updates.forEach((e) => expect(e.name).toBe(TelemetryName.EVENT_COMBAT_STEP));
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
      expect(first.payload['target']).toBe('frontCard');
      expect(first.payload['damage']).toBe(3);
      expect(first.payload['destroyed']).toBe(true);
      expect(first.payload['bonuses']).toEqual([]);
    });

    it('omits optional fields when undefined (no bonuses on second step)', () => {
      const events = deriveEventsFromEntry(mockAttackEntry, MATCH_ID);
      const updates = events.filter((e) => e.type === 'functional_update');
      const second = updates[1]!;
      expect('bonuses' in second.payload).toBe(false);
    });

    it('emits span_ended for the final phase hop only', () => {
      const events = deriveEventsFromEntry(mockAttackEntry, MATCH_ID);
      const ended = events.filter((e) => e.type === 'span_ended');
      expect(ended.length).toBe(1);
    });
  });

  describe('AC #3: non-attack actions emit functional_update + phase spans', () => {
    it('deploy: emits functional_update with gridIndex and phaseAfter', () => {
      const entry = getDeployEntry();
      const events = deriveEventsFromEntry(entry, MATCH_ID);
      const updates = events.filter((e) => e.type === 'functional_update');
      expect(updates.length).toBe(1);
      expect(typeof updates[0]!.payload['gridIndex']).toBe('number');
      expect(typeof updates[0]!.payload['phaseAfter']).toBe('string');
    });

    it('pass: emits span_started × phaseTrace.length and one span_ended', () => {
      const events = deriveEventsFromEntry(mockPassEntry, MATCH_ID);
      const started = events.filter((e) => e.type === 'span_started');
      const ended = events.filter((e) => e.type === 'span_ended');
      expect(started.length).toBe(mockPassEntry.phaseTrace!.length);
      expect(ended.length).toBe(1);
    });

    it('reinforce: emits functional_update with column, gridIndex, cardsDrawn', () => {
      const events = deriveEventsFromEntry(mockReinforceEntry, MATCH_ID);
      const updates = events.filter((e) => e.type === 'functional_update');
      expect(updates.length).toBe(1);
      expect(updates[0]!.payload['column']).toBe(1);
      expect(updates[0]!.payload['gridIndex']).toBe(5);
      expect(updates[0]!.payload['cardsDrawn']).toBe(1);
    });

    it('forfeit: emits functional_update with winnerIndex', () => {
      const events = deriveEventsFromEntry(mockForfeitEntry, MATCH_ID);
      const updates = events.filter((e) => e.type === 'functional_update');
      expect(updates.length).toBe(1);
      expect(updates[0]!.payload['winnerIndex']).toBe(0);
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
      events.forEach((ev) => expect(ev.timestamp).toBe(TIMESTAMP));
    });

    it('span events have turnSpanId as parentId', () => {
      const turnSpanId = `${MATCH_ID}:seq2:turn`;
      const events = deriveEventsFromEntry(mockPassEntry, MATCH_ID);
      const started = events.filter((e) => e.type === 'span_started');
      started.forEach((e) => expect(e.parentId).toBe(turnSpanId));
    });
  });
});
