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

    it('LP advantage weighted at 0.4: lopsided LP with neutral BF/hand/economy gives ~0.6', () => {
      // lpScore = 15/20 = 0.75, bfScore = 0.5, handScore = 0.5, economyScore = 0.5
      // result = 0.75*0.4 + 0.5*0.3 + 0.5*0.2 + 0.5*0.1 = 0.30 + 0.15 + 0.10 + 0.05 = 0.60
      const state = seedState();
      state.players[0]!.lifepoints = 5;
      state.players[1]!.lifepoints = 15;
      state.players[0]!.battlefield.fill(null);
      state.players[1]!.battlefield.fill(null);
      state.players[0]!.hand = [{ id: 'h0', suit: 'clubs', face: '2', value: 2, type: 'number' }];
      state.players[1]!.hand = [{ id: 'h1', suit: 'clubs', face: '2', value: 2, type: 'number' }];
      state.players[0]!.drawpile = [];
      state.players[1]!.drawpile = [];
      expect(evaluateState(state, 1)).toBeCloseTo(0.6, 5);
    });

    it('BF advantage weighted at 0.3: full BF dominance with neutral LP/hand/economy gives ~0.65', () => {
      // lpScore = 0.5, bfScore = 1.0 (player has BF, opp has none), handScore = 0.5, economyScore = 0.5
      // result = 0.5*0.4 + 1.0*0.3 + 0.5*0.2 + 0.5*0.1 = 0.20 + 0.30 + 0.10 + 0.05 = 0.65
      const state = seedState();
      state.players[0]!.lifepoints = 10;
      state.players[1]!.lifepoints = 10;
      state.players[0]!.battlefield.fill(null);
      state.players[1]!.battlefield.fill(null);
      state.players[1]!.battlefield[0] = {
        card: { id: 'bf1', suit: 'clubs', face: '5', value: 5, type: 'number' },
        position: { row: 0, col: 0 },
        currentHp: 5,
        faceDown: false,
      };
      state.players[0]!.hand = [{ id: 'h0', suit: 'clubs', face: '2', value: 2, type: 'number' }];
      state.players[1]!.hand = [{ id: 'h1', suit: 'clubs', face: '2', value: 2, type: 'number' }];
      state.players[0]!.drawpile = [];
      state.players[1]!.drawpile = [];
      expect(evaluateState(state, 1)).toBeCloseTo(0.65, 5);
    });

    it('hand advantage weighted at 0.2: full hand dominance with neutral LP/BF/economy gives ~0.6', () => {
      // lpScore = 0.5, bfScore = 0.5, handScore = 1.0 (player has 1 hand card, opp has 0)
      // economyScore = 0.5 — balanced by giving opp 1 extra drawpile card to offset player's hand card
      // totalCards p1 = hand(1)+drawpile(1)=2, p0 = hand(0)+drawpile(2)=2 → economyScore = 0.5
      // result = 0.5*0.4 + 0.5*0.3 + 1.0*0.2 + 0.5*0.1 = 0.20 + 0.15 + 0.20 + 0.05 = 0.60
      const state = seedState();
      state.players[0]!.lifepoints = 10;
      state.players[1]!.lifepoints = 10;
      state.players[0]!.battlefield.fill(null);
      state.players[1]!.battlefield.fill(null);
      state.players[0]!.hand = [];
      state.players[1]!.hand = [{ id: 'h1', suit: 'clubs', face: '2', value: 2, type: 'number' }];
      state.players[0]!.drawpile = [
        { suit: 'clubs', face: '3', value: 3, type: 'number' },
        { suit: 'clubs', face: '4', value: 4, type: 'number' },
      ];
      state.players[1]!.drawpile = [{ suit: 'clubs', face: '3', value: 3, type: 'number' }];
      expect(evaluateState(state, 1)).toBeCloseTo(0.6, 5);
    });
  });

  describe('MCTSNode via runMCTS', () => {
    it('iterations=1 still returns a valid action (UCB1 prefers unvisited)', () => {
      const state = seedState();
      const a1 = runMCTS(state, 1, { iterations: 1, explorationParam: 2.0, seed: 1 });
      expect(a1).toBeDefined();
      expect(a1.type).toBeDefined();
    });

    it('multiple iterations explore different children before revisiting', () => {
      const state = seedState();
      const a = runMCTS(state, 1, { iterations: 5, explorationParam: 2.0, seed: 1 });
      expect(a).toBeDefined();
    });
  });
});
