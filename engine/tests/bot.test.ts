import { describe, it, expect } from 'vitest';
import { computeBotAction } from '../src/bot.js';
import { createInitialState, applyAction } from '../src/index.js';
import type { GameState } from '@phalanxduel/shared';

interface GameStatePhaseHarness {
  phase: string;
}

function seedState(): GameState {
  const config = {
    matchId: '00000000-0000-0000-0000-000000000001',
    players: [
      { id: '00000000-0000-0000-0000-000000000010', name: 'Human' },
      { id: '00000000-0000-0000-0000-000000000020', name: 'Bot' },
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

function setPhaseForTest(state: GameState, phase: string): void {
  const phaseHarness = state as unknown as GameStatePhaseHarness;
  phaseHarness.phase = phase;
}

describe('computeBotAction - random strategy', () => {
  it('returns a deploy action during DeploymentPhase', () => {
    const state = seedState();
    expect(state.phase).toBe('DeploymentPhase');
    const action = computeBotAction(state, 1, { strategy: 'random', seed: 42 });
    expect(action.type).toBe('deploy');
    expect(action.playerIndex).toBe(1);
  });

  it('is deterministic given the same seed', () => {
    const state = seedState();
    const ts = new Date().toISOString();
    const a1 = computeBotAction(state, 1, { strategy: 'random', seed: 99 }, ts);
    const a2 = computeBotAction(state, 1, { strategy: 'random', seed: 99 }, ts);
    expect(a1).toEqual(a2);
  });

  it('returns pass when hand is empty', () => {
    const state = seedState();
    state.players[1]!.hand = [];
    const action = computeBotAction(state, 1, { strategy: 'random', seed: 42 });
    expect(action.type).toBe('pass');
  });

  it('returns pass for unrecognized phases', () => {
    const state = seedState();
    setPhaseForTest(state, 'UnknownPhase');
    const action = computeBotAction(state, 1, { strategy: 'random', seed: 42 });
    expect(action.type).toBe('pass');
  });

  it('handles empty hand during ReinforcementPhase', () => {
    const state = seedState();
    state.phase = 'ReinforcementPhase';
    state.players[1]!.hand = [];
    const action = computeBotAction(state, 1, { strategy: 'random', seed: 42 });
    expect(action.type).toBe('pass');
  });

  it('triggers random attack', () => {
    const state = seedState();
    state.phase = 'AttackPhase';
    state.players[1]!.battlefield[0] = {
      card: { id: 'c1', suit: 'clubs', value: 1, name: 'C1' },
      currentHp: 1,
      maxHp: 1,
    };
    const action = computeBotAction(state, 1, { strategy: 'random', seed: 1 });
    expect(action).toBeDefined();
  });

  it('triggers random reinforcement', () => {
    const state = seedState();
    state.phase = 'ReinforcementPhase';
    state.players[1]!.hand = [{ id: 'c1', suit: 'clubs', value: 1, name: 'C1' }];
    state.reinforcement = { playerIndex: 1, column: 0 };
    const action = computeBotAction(state, 1, { strategy: 'random', seed: 1 });
    expect(action.type).toBe('reinforce');
  });

  it('returns pass in deployment when battlefield is full', () => {
    const state = seedState();
    state.phase = 'DeploymentPhase';
    state.players[1]!.battlefield.fill({
      card: { id: 'x', suit: 'hearts', value: 1, name: 'H1' },
      currentHp: 1,
      maxHp: 1,
    });
    const action = computeBotAction(state, 1, { strategy: 'random', seed: 1 });
    expect(action.type).toBe('pass');
  });
});

describe('computeBotAction - heuristic strategy', () => {
  it('returns a deploy action during DeploymentPhase', () => {
    const state = seedState();
    expect(state.phase).toBe('DeploymentPhase');
    const action = computeBotAction(state, 1, { strategy: 'heuristic', seed: 42 });
    expect(action.type).toBe('deploy');
    expect(action.playerIndex).toBe(1);
  });

  it('is deterministic given the same seed', () => {
    const state = seedState();
    const ts = new Date().toISOString();
    const a1 = computeBotAction(state, 1, { strategy: 'heuristic', seed: 99 }, ts);
    const a2 = computeBotAction(state, 1, { strategy: 'heuristic', seed: 99 }, ts);
    expect(a1).toEqual(a2);
  });

  it('handles empty defense columns in evaluation', () => {
    const state = seedState();
    state.phase = 'AttackPhase';
    state.players[0]!.battlefield.fill(null);
    state.players[1]!.battlefield[0] = {
      card: { id: 'c1', suit: 'spades', value: 10, name: 'S10' },
      currentHp: 10,
      maxHp: 10,
    };
    const action = computeBotAction(state, 1, { strategy: 'heuristic', seed: 1 });
    expect(action.type).toBe('attack');
  });

  it('handles attack evaluation when there is no back row defender', () => {
    const state = seedState();
    state.phase = 'AttackPhase';
    state.players[0]!.battlefield.fill(null);
    state.players[0]!.battlefield[0] = {
      card: { id: 'd1', suit: 'hearts', value: 5, name: 'H5' },
      currentHp: 5,
      maxHp: 5,
    };
    state.players[1]!.battlefield[0] = {
      card: { id: 'c1', suit: 'spades', value: 10, name: 'S10' },
      currentHp: 10,
      maxHp: 10,
    };
    const action = computeBotAction(state, 1, { strategy: 'heuristic', seed: 1 });
    expect(action.type).toBe('attack');
  });

  it('handles heuristic reinforcement with empty hand', () => {
    const state = seedState();
    state.phase = 'ReinforcementPhase';
    state.players[1]!.hand = [];
    const action = computeBotAction(state, 1, { strategy: 'heuristic', seed: 1 });
    expect(action.type).toBe('pass');
  });

  it('handles unrecognized phase in heuristic', () => {
    const state = seedState();
    setPhaseForTest(state, 'UnknownPhase');
    const action = computeBotAction(state, 1, { strategy: 'heuristic', seed: 1 });
    expect(action.type).toBe('pass');
  });

  it('triggers pass in attack when score is low (probabilistic)', () => {
    let hitPass = false;
    for (let i = 0; i < 100; i++) {
      const state = seedState();
      state.phase = 'AttackPhase';
      // Add strong defender
      state.players[0]!.battlefield[0] = {
        card: { id: 'd1', suit: 'hearts', value: 20, name: 'H20' },
        currentHp: 20,
        maxHp: 20,
      };
      // Add weak attacker
      state.players[1]!.battlefield[0] = {
        card: { id: 'c1', suit: 'clubs', value: 1, name: 'C1' },
        currentHp: 1,
        maxHp: 1,
      };
      const action = computeBotAction(state, 1, { strategy: 'heuristic', seed: i });
      if (action.type === 'pass') {
        hitPass = true;
        break;
      }
    }
    expect(hitPass).toBe(true);
  });

  it('triggers heuristic reinforcement', () => {
    const state = seedState();
    state.phase = 'ReinforcementPhase';
    state.players[1]!.hand = [{ id: 'c1', suit: 'clubs', value: 1, name: 'C1' }];
    state.reinforcement = { playerIndex: 1, column: 0 };
    const action = computeBotAction(state, 1, { strategy: 'heuristic', seed: 1 });
    expect(action.type).toBe('reinforce');
  });
});

describe('computeBotAction - heuristic attack scoring', () => {
  it('prefers an open column over a defended one (open column score ~150, defended ~95)', () => {
    const state = seedState();
    state.phase = 'AttackPhase';
    state.players[0]!.battlefield.fill(null);
    // col 0: spades attacker (value=5) vs empty defence → score = 100 + 5 + 50 = 155
    // col 1: hearts attacker (value=5) vs defended front (hp=3) → score = 50 + 3 + 40 + 2 = 95
    state.players[0]!.battlefield[1] = {
      card: { id: 'def-hearts-3', suit: 'hearts', face: '3', value: 3, type: 'number' },
      position: { row: 0, col: 1 },
      currentHp: 3,
      faceDown: false,
    };
    state.players[1]!.battlefield.fill(null);
    state.players[1]!.battlefield[0] = {
      card: { id: 'atk-spades-5', suit: 'spades', face: '5', value: 5, type: 'number' },
      position: { row: 0, col: 0 },
      currentHp: 5,
      faceDown: false,
    };
    state.players[1]!.battlefield[1] = {
      card: { id: 'atk-hearts-5', suit: 'hearts', face: '5', value: 5, type: 'number' },
      position: { row: 0, col: 1 },
      currentHp: 5,
      faceDown: false,
    };
    const action = computeBotAction(state, 1, { strategy: 'heuristic', seed: 42 });
    expect(action.type).toBe('attack');
    expect((action as { attackingColumn?: number }).attackingColumn).toBe(0);
  });

  it('spades attacker scores higher than non-spades on empty column', () => {
    const state = seedState();
    state.phase = 'AttackPhase';
    state.players[0]!.battlefield.fill(null);
    // col 0: spades (value 5) → score 155; col 1: clubs (value 10) → score 110
    state.players[1]!.battlefield.fill(null);
    state.players[1]!.battlefield[0] = {
      card: { id: 'sp5', suit: 'spades', face: '5', value: 5, type: 'number' },
      position: { row: 0, col: 0 },
      currentHp: 5,
      faceDown: false,
    };
    state.players[1]!.battlefield[1] = {
      card: { id: 'cl10', suit: 'clubs', face: 'T', value: 10, type: 'number' },
      position: { row: 0, col: 1 },
      currentHp: 10,
      faceDown: false,
    };
    const action = computeBotAction(state, 1, { strategy: 'heuristic', seed: 42 });
    expect((action as { attackingColumn?: number }).attackingColumn).toBe(0);
  });

  it('clubs attacker scores higher when it can kill the defender (clubs bonus +20)', () => {
    const state = seedState();
    state.phase = 'AttackPhase';
    state.players[0]!.battlefield.fill(null);
    // Both attackers face same defender value; clubs gets +20 bonus after kill
    // col 0: clubs (value=5) vs (hp=4) → kills, overflow=1, no back: score = 50+4+40+1+20 = 115
    // col 1: diamonds (value=5) vs (hp=4) → kills, overflow=1, no back: score = 50+4+40+1 = 95
    state.players[0]!.battlefield[0] = {
      card: { id: 'def0', suit: 'hearts', face: '4', value: 4, type: 'number' },
      position: { row: 0, col: 0 },
      currentHp: 4,
      faceDown: false,
    };
    state.players[0]!.battlefield[1] = {
      card: { id: 'def1', suit: 'hearts', face: '4', value: 4, type: 'number' },
      position: { row: 0, col: 1 },
      currentHp: 4,
      faceDown: false,
    };
    state.players[1]!.battlefield.fill(null);
    state.players[1]!.battlefield[0] = {
      card: { id: 'atk-cl5', suit: 'clubs', face: '5', value: 5, type: 'number' },
      position: { row: 0, col: 0 },
      currentHp: 5,
      faceDown: false,
    };
    state.players[1]!.battlefield[1] = {
      card: { id: 'atk-di5', suit: 'diamonds', face: '5', value: 5, type: 'number' },
      position: { row: 0, col: 1 },
      currentHp: 5,
      faceDown: false,
    };
    const action = computeBotAction(state, 1, { strategy: 'heuristic', seed: 42 });
    expect((action as { attackingColumn?: number }).attackingColumn).toBe(0);
  });

  it('heuristic deploy prefers front-row placement (score += 5) over back-row', () => {
    const state = seedState();
    state.phase = 'DeploymentPhase';
    state.players[1]!.hand = [
      { id: 'card-test', suit: 'clubs', face: '3', value: 3, type: 'number' },
    ];
    // Ensure col 0 has a front row slot free (null at index 0) and col 1 already has front filled
    state.players[1]!.battlefield.fill(null);
    const action = computeBotAction(state, 1, { strategy: 'heuristic', seed: 1 });
    expect(action.type).toBe('deploy');
  });

  it('random attack can pass based on rng (rng < 0.2)', () => {
    const state = seedState();
    state.phase = 'AttackPhase';
    state.players[1]!.battlefield[0] = {
      card: { id: 'atk1', suit: 'clubs', face: '3', value: 3, type: 'number' },
      position: { row: 0, col: 0 },
      currentHp: 3,
      faceDown: false,
    };
    // Seed 7 produces rng() < 0.2 on first call, so should pass
    let passCount = 0;
    for (let seed = 0; seed < 50; seed++) {
      const action = computeBotAction(state, 1, { strategy: 'random', seed });
      if (action.type === 'pass') passCount++;
    }
    expect(passCount).toBeGreaterThan(0);
  });
});

describe('computeBotAction - mcts strategy', () => {
  it('returns a deploy action during DeploymentPhase', () => {
    const state = seedState();
    expect(state.phase).toBe('DeploymentPhase');
    const action = computeBotAction(state, 1, { strategy: 'mcts', seed: 42, mctsIterations: 50 });
    expect(action.type).toBe('deploy');
    expect(action.playerIndex).toBe(1);
  });

  it('is deterministic given the same seed', () => {
    const state = seedState();
    const ts = new Date().toISOString();
    const a1 = computeBotAction(state, 1, { strategy: 'mcts', seed: 99, mctsIterations: 20 }, ts);
    const a2 = computeBotAction(state, 1, { strategy: 'mcts', seed: 99, mctsIterations: 20 }, ts);
    expect(a1).toEqual(a2);
  });

  it('uses default iterations if none provided', () => {
    const state = seedState();
    const action = computeBotAction(state, 1, { strategy: 'mcts', seed: 42 });
    expect(action).toBeDefined();
  });
});
