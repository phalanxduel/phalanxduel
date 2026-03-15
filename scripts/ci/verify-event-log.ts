/**
 * Event Log Coverage Harness
 *
 * Verifies that deriveEventsFromEntry produces non-empty, schema-valid output
 * for every action type reachable from the engine.
 *
 * Dual-purpose:
 *   - Importable: verifyEventLogCoverage() returns structured CoverageResult[]
 *   - CLI entrypoint: exits non-zero if any result fails
 *
 * Usage: tsx scripts/ci/verify-event-log.ts
 */
import { deriveEventsFromEntry } from '../../engine/src/events.js';
import { PhalanxEventSchema } from '../../shared/src/schema.js';
import type { TransactionLogEntry } from '../../shared/src/schema.js';

export interface CoverageResult {
  actionType: string;
  detailType: string;
  eventCount: number;
  schemaErrors: string[];
  passed: boolean;
}

const MATCH_ID = 'harness-match';
const TIMESTAMP = '2026-01-01T00:00:00.000Z';

// Minimal fixtures — one per coverage case.
// Shape matches what the engine actually produces; reuse patterns from
// engine/tests/events.test.ts.

const fixtures: Array<{ actionType: string; detailType: string; entry: TransactionLogEntry }> = [
  {
    actionType: 'system:init',
    detailType: 'n/a',
    entry: {
      sequenceNumber: 0,
      action: { type: 'system:init', timestamp: TIMESTAMP },
      stateHashBefore: '',
      stateHashAfter: '',
      timestamp: TIMESTAMP,
      details: { type: 'pass' }, // system:init reuses pass detail shape
      phaseTrace: [],
    },
  },
  {
    actionType: 'deploy',
    detailType: 'deploy',
    entry: {
      sequenceNumber: 1,
      action: { type: 'deploy', playerIndex: 0, column: 0, cardId: 'card-1', timestamp: TIMESTAMP },
      stateHashBefore: '',
      stateHashAfter: '',
      timestamp: TIMESTAMP,
      details: { type: 'deploy', gridIndex: 0, phaseAfter: 'DeploymentPhase' },
      phaseTrace: [{ from: 'DeploymentPhase', trigger: 'deploy', to: 'DeploymentPhase' }],
    },
  },
  {
    actionType: 'attack',
    detailType: 'attack',
    entry: {
      sequenceNumber: 2,
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
      details: {
        type: 'attack',
        combat: {
          turnNumber: 1,
          attackerPlayerIndex: 0,
          attackerCard: { id: 'c1', suit: 'spades', face: '5', value: 5, type: 'number' },
          targetColumn: 0,
          baseDamage: 5,
          totalLpDamage: 5,
          steps: [{ target: 'playerLp', damage: 5, lpBefore: 20, lpAfter: 15 }],
        },
        reinforcementTriggered: false,
        victoryTriggered: false,
      },
      phaseTrace: [
        { from: 'AttackPhase', trigger: 'attack', to: 'AttackResolution' },
        { from: 'AttackResolution', trigger: 'system:advance', to: 'CleanupPhase' },
      ],
    },
  },
  {
    actionType: 'pass',
    detailType: 'pass',
    entry: {
      sequenceNumber: 3,
      action: { type: 'pass', playerIndex: 0, timestamp: TIMESTAMP },
      stateHashBefore: '',
      stateHashAfter: '',
      timestamp: TIMESTAMP,
      details: { type: 'pass' },
      phaseTrace: [
        { from: 'AttackPhase', trigger: 'pass', to: 'AttackResolution' },
        { from: 'AttackResolution', trigger: 'system:advance', to: 'CleanupPhase' },
      ],
    },
  },
  {
    actionType: 'reinforce',
    detailType: 'reinforce',
    entry: {
      sequenceNumber: 4,
      action: { type: 'reinforce', playerIndex: 1, cardId: 'card-r', timestamp: TIMESTAMP },
      stateHashBefore: '',
      stateHashAfter: '',
      timestamp: TIMESTAMP,
      details: {
        type: 'reinforce',
        column: 1,
        gridIndex: 5,
        cardsDrawn: 1,
        reinforcementComplete: true,
      },
      phaseTrace: [
        { from: 'ReinforcementPhase', trigger: 'reinforce', to: 'ReinforcementPhase' },
        { from: 'ReinforcementPhase', trigger: 'reinforce:complete', to: 'DrawPhase' },
      ],
    },
  },
  {
    actionType: 'forfeit',
    detailType: 'forfeit',
    entry: {
      sequenceNumber: 5,
      action: { type: 'forfeit', playerIndex: 1, timestamp: TIMESTAMP },
      stateHashBefore: '',
      stateHashAfter: '',
      timestamp: TIMESTAMP,
      details: { type: 'forfeit', winnerIndex: 0 },
      phaseTrace: [{ from: 'AttackPhase', trigger: 'forfeit', to: 'gameOver' }],
    },
  },
];

export function verifyEventLogCoverage(): CoverageResult[] {
  return fixtures.map(({ actionType, detailType, entry }) => {
    const schemaErrors: string[] = [];
    let events: ReturnType<typeof deriveEventsFromEntry>;

    try {
      events = deriveEventsFromEntry(entry, MATCH_ID);
    } catch (err) {
      schemaErrors.push(`deriveEventsFromEntry threw: ${String(err)}`);
      return { actionType, detailType, eventCount: 0, schemaErrors, passed: false };
    }

    for (const ev of events) {
      const result = PhalanxEventSchema.safeParse(ev);
      if (!result.success) {
        schemaErrors.push(`event id=${ev.id}: ${JSON.stringify(result.error.issues)}`);
      }
    }

    const passed = events.length > 0 && schemaErrors.length === 0;
    return { actionType, detailType, eventCount: events.length, schemaErrors, passed };
  });
}

// CLI entrypoint
const results = verifyEventLogCoverage();
const failures = results.filter((r) => !r.passed);

if (failures.length > 0) {
  console.error('Event log coverage check FAILED:');
  for (const f of failures) {
    console.error(
      `  [${f.actionType}/${f.detailType}]: ${f.eventCount} events, errors: ${f.schemaErrors.join('; ')}`,
    );
  }
  process.exit(1);
}

console.log(`Event log coverage check passed: ${results.length} action types verified.`);
for (const r of results) {
  console.log(`  ✓ ${r.actionType}/${r.detailType}: ${r.eventCount} events`);
}
