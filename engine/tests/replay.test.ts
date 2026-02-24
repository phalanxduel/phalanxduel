import { describe, it, expect } from 'vitest';
import { replayGame } from '../src/index.ts';
import type { GameConfig } from '../src/index.ts';
import type { Action } from '@phalanxduel/shared';

const testConfig: GameConfig = {
  matchId: 'test-match-id',
  players: [
    { id: '00000000-0000-0000-0000-000000000001', name: 'Alice' },
    { id: '00000000-0000-0000-0000-000000000002', name: 'Bob' },
  ],
  rngSeed: 42,
};

const MOCK_TIMESTAMP = '2026-02-24T12:00:00.000Z';

describe('PHX-TXLOG-003: Game is replayable from initial config + ordered actions', () => {
  it('replayGame with empty actions list returns valid initial state', () => {
    const result = replayGame(testConfig, []);

    expect(result.valid).toBe(true);
    expect(result.finalState.phase).toBe('AttackPhase');
  });

  it('replayGame with pass actions produces matching state', () => {
    const actions: Action[] = [
      { type: 'pass', playerIndex: 0, timestamp: MOCK_TIMESTAMP },
      { type: 'pass', playerIndex: 1, timestamp: MOCK_TIMESTAMP },
    ];

    // Replay
    const result = replayGame(testConfig, actions);

    expect(result.valid).toBe(true);
    expect(result.finalState.turnNumber).toBe(2);
    expect(result.finalState.phase).toBe('AttackPhase');
  });

  it('replayGame with invalid action returns valid: false at correct index', () => {
    const actions: Action[] = [
      { type: 'pass', playerIndex: 1, timestamp: MOCK_TIMESTAMP }, // wrong player (active is 0)
    ];

    const result = replayGame(testConfig, actions);

    expect(result.valid).toBe(false);
    expect(result.failedAtIndex).toBe(0);
    expect(result.error).toBeDefined();
  });
});
