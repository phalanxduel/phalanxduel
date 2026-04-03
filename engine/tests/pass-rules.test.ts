import { describe, it, expect } from 'vitest';
import { createInitialState, applyAction } from '../src/index.js';
import type { GameState, Action } from '@phalanxduel/shared';

function seedState(): GameState {
  const config = {
    matchId: '00000000-0000-0000-0000-000000000001',
    players: [
      { id: '00000000-0000-0000-0000-000000000010', name: 'P1' },
      { id: '00000000-0000-0000-0000-000000000020', name: 'P2' },
    ] as [{ id: string; name: string }, { id: string; name: string }],
    rngSeed: 42,
  };
  let state = createInitialState(config);
  state = applyAction(state, { type: 'system:init', timestamp: '2026-01-01T00:00:00.000Z' });

  // Skip deployment for testing pass rules
  // Force state into AttackPhase
  state.phase = 'AttackPhase';
  state.activePlayerIndex = 0;
  state.turnNumber = 1;
  state.passState = {
    consecutivePasses: [0, 0],
    totalPasses: [0, 0],
  };

  return state;
}

function seedSpecialStartState(enabled: boolean): GameState {
  const state = seedState();
  state.params.modeSpecialStart.enabled = enabled;
  state.players[0]!.battlefield = Array(state.params.rows * state.params.columns).fill(null);
  state.players[1]!.battlefield = Array(state.params.rows * state.params.columns).fill(null);
  return state;
}

describe('PHX-PASS-001: Pass Rule Enforcement', () => {
  it('increments pass counters when a player passes', () => {
    let state = seedState();
    const passAction: Action = {
      type: 'pass',
      playerIndex: 0,
      timestamp: '2026-01-01T00:00:01.000Z',
    };

    state = applyAction(state, passAction);

    expect(state.passState?.consecutivePasses[0]).toBe(1);
    expect(state.passState?.totalPasses[0]).toBe(1);
    expect(state.passState?.consecutivePasses[1]).toBe(0);
  });

  it('resets consecutive pass counter on attack', () => {
    let state = seedState();
    // Pre-set passes
    state.passState = { consecutivePasses: [2, 0], totalPasses: [2, 0] };

    // Deploy a card for P1 to attack with
    state.players[0]!.battlefield[0] = {
      card: state.players[0]!.hand[0]!,
      position: { row: 0, col: 0 },
      currentHp: 10,
      faceDown: false,
    };

    const attackAction: Action = {
      type: 'attack',
      playerIndex: 0,
      attackingColumn: 0,
      defendingColumn: 0,
      timestamp: '2026-01-01T00:00:02.000Z',
    };

    state = applyAction(state, attackAction);

    expect(state.passState?.consecutivePasses[0]).toBe(0);
    expect(state.passState?.totalPasses[0]).toBe(2); // Total remains
  });

  it('triggers forfeit when consecutive pass limit is reached', () => {
    let state = seedState();
    state.params.modePassRules.maxConsecutivePasses = 3;
    state.passState = { consecutivePasses: [2, 0], totalPasses: [2, 0] };

    const passAction: Action = {
      type: 'pass',
      playerIndex: 0,
      timestamp: '2026-01-01T00:00:03.000Z',
    };
    state = applyAction(state, passAction);

    expect(state.phase).toBe('gameOver');
    expect(state.outcome?.winnerIndex).toBe(1);
    expect(state.outcome?.victoryType).toBe('passLimit');
  });

  it('triggers forfeit when total pass limit is reached', () => {
    let state = seedState();
    state.params.modePassRules.maxTotalPassesPerPlayer = 5;
    state.passState = { consecutivePasses: [0, 0], totalPasses: [4, 0] };

    const passAction: Action = {
      type: 'pass',
      playerIndex: 0,
      timestamp: '2026-01-01T00:00:04.000Z',
    };
    state = applyAction(state, passAction);

    expect(state.phase).toBe('gameOver');
    expect(state.outcome?.winnerIndex).toBe(1);
    expect(state.outcome?.victoryType).toBe('passLimit');
  });

  it('treats no-attacker attack as a pass outside the Special Start window', () => {
    let state = seedSpecialStartState(false);

    state = applyAction(state, {
      type: 'attack',
      playerIndex: 0,
      attackingColumn: 0,
      defendingColumn: 0,
      timestamp: '2026-01-01T00:00:05.000Z',
    });

    expect(state.passState?.consecutivePasses[0]).toBe(1);
    expect(state.passState?.totalPasses[0]).toBe(1);
  });

  it('does not count no-attacker attack as a pass inside the Special Start window', () => {
    let state = seedSpecialStartState(true);

    state = applyAction(state, {
      type: 'attack',
      playerIndex: 0,
      attackingColumn: 0,
      defendingColumn: 0,
      timestamp: '2026-01-01T00:00:06.000Z',
    });

    expect(state.passState?.consecutivePasses[0]).toBe(0);
    expect(state.passState?.totalPasses[0]).toBe(0);
  });
});
