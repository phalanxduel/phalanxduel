import { describe, it, expect } from 'vitest';
import { computeBotAction } from '../src/bot.js';
import { runMCTS, evaluateState } from '../src/mcts.js';
import { createInitialState, applyAction, getValidActions } from '../src/index.js';
import { isGameOver } from '@phalanxduel/shared';

function seedState() {
  const config = {
    matchId: 'adversarial-match',
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

describe('Bot Adversarial Paths', () => {
  describe('The "What are you doing here" path', () => {
    it('handles computeBotAction when phase is gameOver', () => {
      const state = seedState();
      state.phase = 'gameOver';
      const action = computeBotAction(state, 1, { strategy: 'mcts' });
      expect(action.type).toBe('pass');
    });

    it('handles runMCTS when iterations is 0', () => {
      const state = seedState();
      const action = runMCTS(state, 1, { iterations: 0 });
      // Should still return a valid action (the first available one)
      expect(action).toBeDefined();
    });

    it('handles evaluateState with missing opponent', () => {
      const state = seedState();
      (state.players as any)[0] = null;
      const score = evaluateState(state, 1);
      expect(score).toBe(0.5);
    });
  });

  describe('The "Sneaky" path', () => {
    it('handles botConfig with invalid strategy (falls back to random)', () => {
      const state = seedState();
      const action = computeBotAction(state, 1, { strategy: 'invalid-strat' as any });
      expect(action).toBeDefined();
    });

    it('handles MCTS with extremely high exploration param', () => {
      const state = seedState();
      const action = runMCTS(state, 1, { iterations: 10, explorationParam: 1000 });
      expect(action).toBeDefined();
    });
  });

  describe('The "Moody" path', () => {
    it('handles evaluateState when both players are dead (draw)', () => {
      const state = seedState();
      state.players[0]!.lifepoints = 0;
      state.players[1]!.lifepoints = 0;
      const score = evaluateState(state, 1);
      expect(score).toBe(0.5);
    });

    it('handles evaluateState when both players have massive resources', () => {
      const state = seedState();
      state.players[0]!.lifepoints = 999;
      state.players[1]!.lifepoints = 999;
      const score = evaluateState(state, 1);
      expect(score).toBeCloseTo(0.5);
    });
  });

  describe('The "Desire" path', () => {
    it('prefers winning immediately over anything else', () => {
      const state = seedState();
      state.phase = 'AttackPhase';
      state.activePlayerIndex = 1;
      // Opponent is 1 HP away from death
      state.players[0]!.lifepoints = 1;
      state.players[1]!.lifepoints = 1;
      // Bot has an attacker that can kill
      state.players[1]!.battlefield[0] = {
        card: { id: 'c1', suit: 'clubs', value: 10, name: 'C10' },
        currentHp: 10,
        maxHp: 10,
      };

      const action = runMCTS(state, 1, { iterations: 1000, explorationParam: 0 });
      expect(action.type).toBe('attack');
    });
  });
});
