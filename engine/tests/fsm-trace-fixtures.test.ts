import { describe, it, expect } from 'vitest';
import { createInitialState, applyAction } from '../src/index.ts';
import type { GameState, PhaseHopTrace } from '@phalanxduel/shared';
import fixturesJson from './fixtures/phase-trace-fixtures.json';

const MOCK_TIMESTAMP = '2026-02-26T12:00:00.000Z';

interface PhaseTraceFixtureSet {
  schemaVersion: number;
  cases: Record<string, PhaseHopTrace[]>;
}

const fixtures = fixturesJson as PhaseTraceFixtureSet;

function makeInitialState(modeClassicDeployment: boolean): GameState {
  const state = createInitialState({
    matchId: '00000000-0000-0000-0000-000000000000',
    players: [
      { id: '00000000-0000-0000-0000-000000000001', name: 'Alice' },
      { id: '00000000-0000-0000-0000-000000000002', name: 'Bob' },
    ],
    rngSeed: 1337,
    drawTimestamp: MOCK_TIMESTAMP,
  });

  if (modeClassicDeployment) {
    return state;
  }

  return {
    ...state,
    params: {
      ...state.params,
      modeClassicDeployment: false,
    },
  };
}

function requireFixture(caseId: string): PhaseHopTrace[] {
  const fixture = fixtures.cases[caseId];
  if (!fixture) {
    throw new Error(`Missing phase-trace fixture case: ${caseId}`);
  }
  return fixture;
}

function lastPhaseTrace(state: GameState): PhaseHopTrace[] {
  const entry = state.transactionLog?.at(-1);
  if (!entry?.phaseTrace) {
    throw new Error('Expected transaction log entry with phaseTrace');
  }
  return entry.phaseTrace;
}

describe('phase trace fixture parity', () => {
  it('fixtures file schema version is supported', () => {
    expect(fixtures.schemaVersion).toBe(1);
  });

  it('system:init enters DeploymentPhase when classic deployment is enabled', () => {
    const state = makeInitialState(true);
    const result = applyAction(state, { type: 'system:init', timestamp: MOCK_TIMESTAMP });
    expect(lastPhaseTrace(result)).toEqual(requireFixture('systemInitDeployment'));
  });

  it('system:init enters AttackPhase when classic deployment is disabled', () => {
    const state = makeInitialState(false);
    const result = applyAction(state, { type: 'system:init', timestamp: MOCK_TIMESTAMP });
    expect(lastPhaseTrace(result)).toEqual(requireFixture('systemInitAttackNoDeployment'));
  });

  it('pass produces the canonical full attack-cycle phase trace', () => {
    let state = makeInitialState(false);
    state = applyAction(state, { type: 'system:init', timestamp: MOCK_TIMESTAMP });
    const result = applyAction(state, {
      type: 'pass',
      playerIndex: state.activePlayerIndex,
      timestamp: MOCK_TIMESTAMP,
    });
    expect(lastPhaseTrace(result)).toEqual(requireFixture('passCycle'));
  });

  it('forfeit from AttackPhase produces a single terminal hop', () => {
    let state = makeInitialState(false);
    state = applyAction(state, { type: 'system:init', timestamp: MOCK_TIMESTAMP });
    const result = applyAction(state, {
      type: 'forfeit',
      playerIndex: state.activePlayerIndex,
      timestamp: MOCK_TIMESTAMP,
    });
    expect(lastPhaseTrace(result)).toEqual(requireFixture('forfeitAttackPhase'));
  });
});
