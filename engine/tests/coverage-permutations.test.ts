import { describe, it, expect } from 'vitest';
import { createInitialState, applyAction, validateAction, getValidActions } from '../src/index.js';
import {
  transitionsTo,
  assertTransition,
  canHandleAction,
  transitionsFrom,
  findTransition,
} from '../src/state-machine.js';
import type { GameState, Action, Battlefield } from '@phalanxduel/shared';

const MOCK_TIMESTAMP = '2026-03-20T12:00:00.000Z';

describe('Engine Coverage & Permutations', () => {
  describe('State Machine Helpers', () => {
    it('transitionsTo returns expected edges', () => {
      const edges = transitionsTo('gameOver');
      expect(edges.length).toBeGreaterThan(0);
      expect(edges.some((e) => e.trigger === 'forfeit')).toBe(true);
    });

    it('assertTransition throws on invalid transition', () => {
      expect(() => assertTransition('gameOver', 'attack' as any, 'AttackPhase' as any)).toThrow(
        /Invalid phase transition/,
      );
    });

    it('canHandleAction returns true for valid action types', () => {
      expect(canHandleAction('AttackPhase', 'attack')).toBe(true);
      expect(canHandleAction('AttackPhase', 'deploy')).toBe(false);
    });

    it('findTransition returns undefined for non-existent trigger', () => {
      expect(findTransition('AttackPhase', 'deploy' as any)).toBeUndefined();
    });
  });

  describe('Action Validation Gaps', () => {
    const baseConfig = {
      matchId: 'test-match',
      players: [
        { id: 'p1', name: 'A' },
        { id: 'p2', name: 'B' },
      ],
      rngSeed: 1,
    };

    it('rejects system:init if not explicitly allowed', () => {
      const state = createInitialState(baseConfig);
      const result = validateAction(state, { type: 'system:init', timestamp: MOCK_TIMESTAMP });
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/internal action/);
    });

    it('rejects deploy with invalid column', () => {
      const state = createInitialState({ ...baseConfig, gameOptions: { classicDeployment: true } });
      const initS = applyAction(
        state,
        { type: 'system:init', timestamp: MOCK_TIMESTAMP },
        { allowSystemInit: true },
      );
      const result = validateAction(initS, {
        type: 'deploy',
        playerIndex: initS.activePlayerIndex,
        column: 99,
        cardId: initS.players[0].hand[0].id,
        timestamp: MOCK_TIMESTAMP,
      });
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/Column out of range/);
    });

    it('rejects deploy with card not in hand', () => {
      const state = createInitialState({ ...baseConfig, gameOptions: { classicDeployment: true } });
      const initS = applyAction(
        state,
        { type: 'system:init', timestamp: MOCK_TIMESTAMP },
        { allowSystemInit: true },
      );
      const result = validateAction(initS, {
        type: 'deploy',
        playerIndex: initS.activePlayerIndex,
        column: 0,
        cardId: 'wrong-card',
        timestamp: MOCK_TIMESTAMP,
      });
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/Card not found in hand/);
    });

    it('rejects attack with attackingColumn out of range', () => {
      const state = createInitialState({
        ...baseConfig,
        gameOptions: { classicDeployment: false },
      });
      const initS = applyAction(
        state,
        { type: 'system:init', timestamp: MOCK_TIMESTAMP },
        { allowSystemInit: true },
      );
      const result = validateAction(initS, {
        type: 'attack',
        playerIndex: initS.activePlayerIndex,
        attackingColumn: 99,
        defendingColumn: 99,
        timestamp: MOCK_TIMESTAMP,
      });
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/front-row cards/);
    });

    it('rejects attack with defendingColumn mismatch', () => {
      const state = createInitialState({
        ...baseConfig,
        gameOptions: { classicDeployment: false },
      });
      const initS = applyAction(
        state,
        { type: 'system:init', timestamp: MOCK_TIMESTAMP },
        { allowSystemInit: true },
      );
      const result = validateAction(initS, {
        type: 'attack',
        playerIndex: initS.activePlayerIndex,
        attackingColumn: 0,
        defendingColumn: 1,
        timestamp: MOCK_TIMESTAMP,
      });
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/directly across/);
    });

    it('rejects reinforce with card not in hand', () => {
      let state = createInitialState({ ...baseConfig, gameOptions: { classicDeployment: false } });
      state = applyAction(
        state,
        { type: 'system:init', timestamp: MOCK_TIMESTAMP },
        { allowSystemInit: true },
      );
      state.phase = 'ReinforcementPhase';
      state.reinforcement = { column: 0, attackerIndex: 1 };
      state.activePlayerIndex = 0;
      const result = validateAction(state, {
        type: 'reinforce',
        playerIndex: 0,
        cardId: 'wrong-card',
        timestamp: MOCK_TIMESTAMP,
      });
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/Card not found in hand/);
    });

    it('rejects reinforce with no context', () => {
      let state = createInitialState({ ...baseConfig, gameOptions: { classicDeployment: false } });
      state = applyAction(
        state,
        { type: 'system:init', timestamp: MOCK_TIMESTAMP },
        { allowSystemInit: true },
      );
      state.phase = 'ReinforcementPhase';
      state.reinforcement = undefined;
      state.activePlayerIndex = 0;
      const result = validateAction(state, {
        type: 'reinforce',
        playerIndex: 0,
        cardId: state.players[0].hand[0].id,
        timestamp: MOCK_TIMESTAMP,
      });
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/No reinforcement context/);
    });
  });

  describe('State Manipulator Throws', () => {
    const baseConfig = {
      matchId: 'test-match',
      players: [
        { id: 'p1', name: 'A' },
        { id: 'p2', name: 'B' },
      ],
      rngSeed: 1,
    };

    it('applyAction throws on validation error', () => {
      const state = createInitialState(baseConfig);
      expect(() =>
        applyAction(state, {
          type: 'deploy',
          playerIndex: 0,
          column: 0,
          cardId: 'any',
          timestamp: MOCK_TIMESTAMP,
        }),
      ).toThrow(/not allowed in phase/);
    });

    it('system:init is no-op in action phase', () => {
      let state = createInitialState({ ...baseConfig, gameOptions: { classicDeployment: false } });
      state = applyAction(
        state,
        { type: 'system:init', timestamp: MOCK_TIMESTAMP },
        { allowSystemInit: true },
      );
      expect(state.phase).toBe('AttackPhase');
      const nextState = applyAction(
        state,
        { type: 'system:init', timestamp: MOCK_TIMESTAMP },
        { allowSystemInit: true },
      );
      expect(nextState.phase).toBe('AttackPhase');
      expect(nextState.transactionLog?.at(-1)?.details.type).toBe('pass');
    });
  });

  describe('Permutations: Grid & Rules', () => {
    it('handles 3x3 grid (odd columns)', () => {
      const state = createInitialState({
        matchId: '3x3-match',
        players: [
          { id: 'p1', name: 'A' },
          { id: 'p2', name: 'B' },
        ],
        rngSeed: 1,
        matchParams: { columns: 3, rows: 3 } as any,
      });
      expect(state.players[0].battlefield.length).toBe(9);
    });

    it('handles cumulative damage persistence', () => {
      const state = createInitialState({
        matchId: 'cumulative-match',
        players: [
          { id: 'p1', name: 'A' },
          { id: 'p2', name: 'B' },
        ],
        rngSeed: 1,
        gameOptions: { damageMode: 'cumulative' },
      });
      expect(state.params.modeDamagePersistence).toBe('cumulative');
    });

    it('victory by card depletion', () => {
      let state = createInitialState({
        matchId: 'depletion-match',
        players: [
          { id: 'p1', name: 'A' },
          { id: 'p2', name: 'B' },
        ],
        rngSeed: 1,
        gameOptions: { classicDeployment: false },
      });
      state = applyAction(
        state,
        { type: 'system:init', timestamp: MOCK_TIMESTAMP },
        { allowSystemInit: true },
      );

      // Wipe player 1's cards
      state.players[1].battlefield = [
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
      ] as Battlefield;
      state.players[1].hand = [];
      state.players[1].drawpile = [];

      // Pass from P0 to trigger victory check
      const nextState = applyAction(state, {
        type: 'pass',
        playerIndex: 0,
        timestamp: MOCK_TIMESTAMP,
      });
      expect(nextState.phase).toBe('gameOver');
      expect(nextState.outcome?.victoryType).toBe('cardDepletion');
    });
  });

  describe('getValidActions Gaps', () => {
    it('returns empty list for non-existent player', () => {
      const state = createInitialState({
        matchId: 'p-match',
        players: [
          { id: 'p1', name: 'A' },
          { id: 'p2', name: 'B' },
        ],
        rngSeed: 1,
      });
      expect(getValidActions(state, 99)).toEqual([]);
    });

    it('returns only forfeit for non-active player', () => {
      const state = createInitialState({
        matchId: 'p-match',
        players: [
          { id: 'p1', name: 'A' },
          { id: 'p2', name: 'B' },
        ],
        rngSeed: 1,
      });
      const initS = applyAction(
        state,
        { type: 'system:init', timestamp: MOCK_TIMESTAMP },
        { allowSystemInit: true },
      );
      const actions = getValidActions(initS, (initS.activePlayerIndex + 1) % 2);
      expect(actions.every((a) => a.type === 'forfeit')).toBe(true);
    });
  });
});
