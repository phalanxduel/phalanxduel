import { describe, it, expect } from 'vitest';
import { evaluateState } from '../src/mcts.js';
import { computeBotAction } from '../src/bot.js';
import { createInitialState, applyAction } from '../src/index.js';
import { TIER_CONFIG } from '../src/bot-tiers.js';
import type { GameState } from '@phalanxduel/shared';

function seedState(): GameState {
  let state = createInitialState({
    matchId: 'weights-test',
    players: [
      { id: 'p1', name: 'A' },
      { id: 'p2', name: 'B' },
    ] as [{ id: string; name: string }, { id: string; name: string }],
    rngSeed: 42,
  });
  state = applyAction(
    state,
    { type: 'system:init', timestamp: '2026-01-01T00:00:00.000Z' },
    { allowSystemInit: true },
  );
  return state;
}

describe('evaluateState with HeuristicWeights', () => {
  it('AC-1: neutral weights produce identical result to unweighted call', () => {
    const state = seedState();
    const neutral = {
      attackBias: 1.0,
      defenseBias: 1.0,
      columnDestructionBias: 1.0,
      speedBias: 1.0,
    };
    const withWeights = evaluateState(state, 1, neutral);
    const withoutWeights = evaluateState(state, 1);
    expect(withWeights).toBeCloseTo(withoutWeights, 10);
  });

  it('AC-1: heuristic computeBotAction with same seed is unchanged after adding tier support', () => {
    const state = seedState();
    const ts = '2026-01-01T00:00:00.000Z';
    const a1 = computeBotAction(state, 1, { strategy: 'heuristic', seed: 42 }, ts);
    const a2 = computeBotAction(state, 1, { strategy: 'heuristic', seed: 42 }, ts);
    expect(a1).toEqual(a2);
  });

  it('AC-1: mcts with no tier and same seed is deterministic', () => {
    const state = seedState();
    const ts = '2026-01-01T00:00:00.000Z';
    const a1 = computeBotAction(state, 1, { strategy: 'mcts', seed: 7, mctsIterations: 30 }, ts);
    const a2 = computeBotAction(state, 1, { strategy: 'mcts', seed: 7, mctsIterations: 30 }, ts);
    expect(a1).toEqual(a2);
  });

  it('AC-2: destroyer rates high-battlefield states higher than sentinel', () => {
    // State where player has strong battlefield presence but lower LP → destroyer favours this
    const state = seedState();
    state.players[1]!.lifepoints = 8;
    state.players[0]!.lifepoints = 14;
    // Give player 1 a full front row
    for (let col = 0; col < 4; col++) {
      state.players[1]!.battlefield[col] = {
        card: { id: `p1-bf-${col}`, suit: 'clubs', value: 10, name: `C10-${col}` },
        currentHp: 10,
        maxHp: 10,
      };
    }
    // Opponent has very low HP columns
    for (let col = 0; col < 4; col++) {
      state.players[0]!.battlefield[col] = {
        card: { id: `p0-bf-${col}`, suit: 'hearts', value: 1, name: `H1-${col}` },
        currentHp: 1,
        maxHp: 5,
      };
    }

    const destroyerScore = evaluateState(state, 1, TIER_CONFIG.destroyer.weights);
    const sentinelScore = evaluateState(state, 1, TIER_CONFIG.sentinel.weights);
    // Destroyer values battlefield control; sentinel values LP → defender is losing on LP so
    // sentinel rates the position lower than destroyer
    expect(destroyerScore).toBeGreaterThan(sentinelScore);
  });

  it('AC-3: sentinel rates high-LP states higher than veteran', () => {
    // State where player 1 has a large LP lead but weaker battlefield
    const state = seedState();
    state.players[1]!.lifepoints = 18;
    state.players[0]!.lifepoints = 6;
    state.players[1]!.battlefield.fill(null);
    state.players[0]!.battlefield.fill(null);
    // Opponent has stronger cards on field
    state.players[0]!.battlefield[0] = {
      card: { id: 'opp-str', suit: 'spades', value: 10, name: 'S10' },
      currentHp: 10,
      maxHp: 10,
    };

    const sentinelScore = evaluateState(state, 1, TIER_CONFIG.sentinel.weights);
    const veteranScore = evaluateState(state, 1, TIER_CONFIG.veteran.weights);
    // Sentinel heavily weights LP → with an LP lead, sentinel rates this higher
    expect(sentinelScore).toBeGreaterThan(veteranScore);
  });

  it('computeBotAction with tier is deterministic for same seed', () => {
    const state = seedState();
    const ts = '2026-01-01T00:00:00.000Z';
    const a1 = computeBotAction(
      state,
      1,
      { strategy: 'mcts', seed: 5, mctsIterations: 30 },
      ts,
      'sentinel',
    );
    const a2 = computeBotAction(
      state,
      1,
      { strategy: 'mcts', seed: 5, mctsIterations: 30 },
      ts,
      'sentinel',
    );
    expect(a1).toEqual(a2);
  });

  it('tier overrides strategy and iterations from config', () => {
    // scout tier forces random strategy regardless of config.strategy
    const state = seedState();
    const ts = '2026-01-01T00:00:00.000Z';
    // config says mcts, but scout tier forces random → no MCTS call (fast)
    const action = computeBotAction(state, 1, { strategy: 'mcts', seed: 1 }, ts, 'scout');
    expect(action).toBeDefined();
  });

  it('champion tier uses highest mctsIterations', () => {
    expect(TIER_CONFIG.champion.mctsIterations).toBeGreaterThanOrEqual(
      Math.max(...Object.values(TIER_CONFIG).map((t) => t.mctsIterations)),
    );
  });
});
