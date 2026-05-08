/**
 * Property-based tests using fast-check.
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { createInitialState, applyAction, validateAction, getValidActions } from '../src/index.js';
import type { GameState, BattlefieldCard } from '@phalanxduel/shared';

const VALID_PHASES = [
  'StartTurn',
  'DeploymentPhase',
  'AttackPhase',
  'AttackResolution',
  'CleanupPhase',
  'ReinforcementPhase',
  'DrawPhase',
  'EndTurn',
  'gameOver',
];

function checkInvariants(state: GameState, prevState?: GameState): void {
  expect(VALID_PHASES).toContain(state.phase);
  expect([0, 1]).toContain(state.activePlayerIndex);

  for (let pi = 0; pi < 2; pi++) {
    const p = state.players[pi]!;
    const bfCount = p.battlefield.filter((s) => s !== null).length;
    const total = bfCount + p.hand.length + p.drawpile.length + p.discardPile.length;

    // Invariant: Total cards for each player must always be 52 (standard deck)
    expect(total).toBe(52);

    for (const slot of p.battlefield) {
      if (slot !== null) {
        // Invariant: Card HP cannot exceed its base value
        expect(slot.currentHp).toBeGreaterThanOrEqual(0);
        expect(slot.currentHp).toBeLessThanOrEqual(slot.card.value);
      }
    }
    // Invariant: Lifepoints cannot be negative
    expect(p.lifepoints).toBeGreaterThanOrEqual(0);

    // Semantic Invariant: Lifepoints can only decrease or stay the same (no healing in v1.0)
    if (prevState) {
      const prevP = prevState.players[pi]!;
      expect(p.lifepoints).toBeLessThanOrEqual(prevP.lifepoints);
    }
  }

  if (state.phase === 'gameOver') {
    expect(state.outcome).toBeDefined();
    expect([0, 1]).toContain(state.outcome?.winnerIndex);
  }
}

describe('Property-based testing with fast-check', () => {
  it('initial state should always satisfy invariants', () => {
    fc.assert(
      fc.property(
        fc.integer(), // rngSeed
        fc.boolean(), // quickStart
        fc.boolean(), // classicDeployment
        (seed, quickStart, classicDeployment) => {
          const config = {
            matchId: 'test-match',
            players: [
              { id: 'p0', name: 'Player 0' },
              { id: 'p1', name: 'Player 1' },
            ],
            rngSeed: seed,
            gameOptions: {
              quickStart,
              classicDeployment,
              damageMode: 'classic' as const,
              startingLifepoints: 20,
            },
          };
          const state = createInitialState(config);
          checkInvariants(state);
        },
      ),
    );
  });

  it('any valid action should preserve invariants', () => {
    fc.assert(
      fc.property(
        fc.integer(), // seed
        (seed) => {
          const config = {
            matchId: 'test-match',
            players: [
              { id: 'p0', name: 'Player 0' },
              { id: 'p1', name: 'Player 1' },
            ],
            rngSeed: seed,
          };
          let state = createInitialState(config);

          // Apply system:init to get into a playable state
          state = applyAction(
            state,
            { type: 'system:init', timestamp: '2026-01-01' },
            { allowSystemInit: true },
          );

          // Try a few steps of random valid actions
          for (let i = 0; i < 50; i++) {
            if (state.phase === 'gameOver') break;

            const actions = getValidActions(state, state.activePlayerIndex);
            if (actions.length === 0) break;

            // Pick a random valid action — use Math.abs to avoid negative index
            const actionIndex = Math.abs(seed + i) % actions.length;
            const action = actions[actionIndex]!;

            try {
              const prevState = state;
              state = applyAction(state, action);
              checkInvariants(state, prevState);
            } catch (err) {
              throw new Error(
                `Failed to apply action ${JSON.stringify(action)} in phase ${state.phase}: ${err}`,
              );
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
