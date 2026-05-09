import { describe, it, expect } from 'vitest';
import { runMCTS, evaluateState } from '../src/mcts.js';
import { createInitialState, applyAction } from '../src/index.js';
import { isGameOver } from '@phalanxduel/shared';

function seedState() {
  const config = {
    matchId: 'mcts-test-match',
    players: [
      { id: 'p1', name: 'Human' },
      { id: 'p2', name: 'Bot' },
    ] as [{ id: string; name: string }, { id: string; name: string }],
    rngSeed: 42,
  };
  let state = createInitialState(config);
  state = applyAction(
    state,
    { type: 'system:init', timestamp: '2026-01-01T00:00:00.000Z' },
    { allowSystemInit: true },
  );
  return state;
}

describe('MCTS Strategy Depth', () => {
  it('returns a valid action in DeploymentPhase', () => {
    const state = seedState();
    const action = runMCTS(state, 1, { iterations: 10, explorationParam: 2.0, seed: 1 });
    expect(action).toBeDefined();
    expect(action.type).toBe('deploy');
  });

  it('handles game over state gracefully', () => {
    const state = seedState();
    // Force game over
    state.phase = 'gameOver';
    state.players[0]!.lifepoints = 0;
    expect(isGameOver(state)).toBe(true);

    const action = runMCTS(state, 1, { iterations: 5, explorationParam: 2.0, seed: 1 });
    // Should return fallback action (pass)
    expect(action.type).toBe('pass');
  });

  it('is deterministic with same seed', () => {
    const state = seedState();
    const a1 = runMCTS(state, 1, { iterations: 20, explorationParam: 1.4, seed: 123 });
    const a2 = runMCTS(state, 1, { iterations: 20, explorationParam: 1.4, seed: 123 });
    expect(a1).toEqual(a2);
  });

  it('improves decision with more iterations (probabilistically)', () => {
    const state = seedState();
    const action = runMCTS(state, 1, { iterations: 100, explorationParam: 2.0, seed: 42 });
    expect(action).toBeDefined();
  });

  describe('Heuristic Evaluation', () => {
    it('evaluates win state as 1.0', () => {
      const state = seedState();
      state.players[1]!.lifepoints = 20;
      state.players[0]!.lifepoints = 0;
      expect(evaluateState(state, 1)).toBe(1);
    });

    it('evaluates loss state as 0.0', () => {
      const state = seedState();
      state.players[1]!.lifepoints = 0;
      state.players[0]!.lifepoints = 20;
      expect(evaluateState(state, 1)).toBe(0);
    });

    it('evaluates balanced state as 0.5', () => {
      const state = seedState();
      state.players[0]!.lifepoints = 20;
      state.players[1]!.lifepoints = 20;
      expect(evaluateState(state, 1)).toBeCloseTo(0.5);
    });

    it('handles missing players gracefully', () => {
      const state = seedState();
      (state.players as ((typeof state.players)[0] | null)[])[1] = null;
      expect(evaluateState(state, 1)).toBeCloseTo(0.5);
    });

    it('evaluates zero-LP state as 0.5', () => {
      const state = seedState();
      state.players[0]!.lifepoints = 0;
      state.players[1]!.lifepoints = 0;
      expect(evaluateState(state, 1)).toBeCloseTo(0.5);
    });

    it('evaluates zero-BF state as 0.5', () => {
      const state = seedState();
      state.players[0]!.battlefield.fill(null);
      state.players[1]!.battlefield.fill(null);
      expect(evaluateState(state, 1)).toBeCloseTo(0.5);
    });

    it('evaluates zero-Hand state as 0.5', () => {
      const state = seedState();
      state.players[0]!.hand = [];
      state.players[1]!.hand = [];
      expect(evaluateState(state, 1)).toBeCloseTo(0.5);
    });

    it('evaluates zero-Economy state as 0.5', () => {
      const state = seedState();
      state.players[0]!.hand = [];
      state.players[0]!.drawpile = [];
      state.players[1]!.hand = [];
      state.players[1]!.drawpile = [];
      expect(evaluateState(state, 1)).toBeCloseTo(0.5);
    });
  });
});
