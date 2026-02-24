import { describe, it, expect } from 'vitest';
import { replayGame } from '../src/index.ts';
import type { GameConfig } from '../src/index.ts';
import type { Action } from '@phalanxduel/shared';

const MOCK_TIMESTAMP = '2026-02-24T12:00:00.000Z';

const testConfig: GameConfig = {
  matchId: 'test-match-id',
  players: [
    { id: '00000000-0000-0000-0000-000000000001', name: 'Alice' },
    { id: '00000000-0000-0000-0000-000000000002', name: 'Bob' },
  ],
  rngSeed: 42,
  drawTimestamp: MOCK_TIMESTAMP,
};

describe('PHX-TXLOG-003: Game is replayable from initial config + ordered actions', () => {
  it('replayGame with empty actions list returns valid initial state', () => {
    const result = replayGame(testConfig, []);

    expect(result.valid).toBe(true);
    expect(result.finalState.phase).toBe('DeploymentPhase');
  });

  it('replayGame with deploy actions produces matching state', () => {
    // Get initial state to find card IDs
    const initialState = replayGame(testConfig, []).finalState;
    // P2 (index 1) deploys first in strict classic mode
    const p1CardId = initialState.players[1]!.hand[0]!.id;
    const p0CardId = initialState.players[0]!.hand[0]!.id;

    const actions: Action[] = [
      { type: 'deploy', playerIndex: 1, column: 0, cardId: p1CardId, timestamp: MOCK_TIMESTAMP },
      { type: 'deploy', playerIndex: 0, column: 0, cardId: p0CardId, timestamp: MOCK_TIMESTAMP },
    ];

    // Replay
    const result = replayGame(testConfig, actions);

    expect(
      result.error,
      `Replay failed at index ${result.failedAtIndex}: ${result.error}`,
    ).toBeUndefined();
    expect(result.valid).toBe(true);
    expect(result.finalState.phase).toBe('DeploymentPhase');
    expect(result.finalState.players[0]!.battlefield[0]).not.toBeNull();
    expect(result.finalState.players[1]!.battlefield[0]).not.toBeNull();
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
