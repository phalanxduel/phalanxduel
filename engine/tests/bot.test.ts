import { describe, it, expect } from 'vitest';
import { computeBotAction } from '../src/bot.js';
import { createInitialState, applyAction } from '../src/index.js';
import type { GameState } from '@phalanxduel/shared';

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
  state = applyAction(state, { type: 'system:init', timestamp: '2026-01-01T00:00:00.000Z' });
  return state;
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- intentionally testing unknown phase
    (state as any).phase = 'UnknownPhase';
    const action = computeBotAction(state, 1, { strategy: 'random', seed: 42 });
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
});
