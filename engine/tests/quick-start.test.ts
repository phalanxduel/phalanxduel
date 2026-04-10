import { describe, it, expect } from 'vitest';
import { createInitialState, applyAction, computeBotAction } from '../src/index.ts';
import type { GameState, BattlefieldCard } from '@phalanxduel/shared';

const MATCH_ID = '00000000-0000-0000-0000-000000000001';
const PLAYERS: [{ id: string; name: string }, { id: string; name: string }] = [
  { id: '00000000-0000-0000-0000-000000000010', name: 'Alice' },
  { id: '00000000-0000-0000-0000-000000000020', name: 'Bob' },
];
const TIMESTAMP = '2026-01-01T00:00:00.000Z';

function createQuickStartState(seed = 42): GameState {
  const initial = createInitialState({
    matchId: MATCH_ID,
    players: PLAYERS,
    rngSeed: seed,
    gameOptions: {
      damageMode: 'classic',
      startingLifepoints: 20,
      classicDeployment: true,
      quickStart: true,
    },
    drawTimestamp: TIMESTAMP,
  });
  return applyAction(initial, { type: 'system:init', timestamp: TIMESTAMP });
}

function createNormalState(seed = 42): GameState {
  const initial = createInitialState({
    matchId: MATCH_ID,
    players: PLAYERS,
    rngSeed: seed,
    gameOptions: {
      damageMode: 'classic',
      startingLifepoints: 20,
      classicDeployment: true,
    },
    drawTimestamp: TIMESTAMP,
  });
  return applyAction(initial, { type: 'system:init', timestamp: TIMESTAMP });
}

describe('quickStart', () => {
  it('pre-fills both battlefields with 8 cards each (2x4 grid)', () => {
    const state = createQuickStartState();

    for (const player of state.players) {
      const filledSlots = player.battlefield.filter((s) => s !== null);
      expect(filledSlots).toHaveLength(8);
    }
  });

  it('leaves 4 cards in hand after deploying 8 (initialDraw=12, slots=8)', () => {
    const state = createQuickStartState();

    for (const player of state.players) {
      expect(player.hand).toHaveLength(4);
    }
  });

  it('deploys cards face-up (not faceDown)', () => {
    const state = createQuickStartState();

    for (const player of state.players) {
      for (const slot of player.battlefield) {
        if (slot) {
          expect((slot as BattlefieldCard).faceDown).toBe(false);
        }
      }
    }
  });

  it('sets modeQuickStart in params', () => {
    const state = createQuickStartState();
    expect(state.params.modeQuickStart).toBe(true);
  });

  it('starts in StartTurn phase then transitions to AttackPhase via system:init', () => {
    const initial = createInitialState({
      matchId: MATCH_ID,
      players: PLAYERS,
      rngSeed: 42,
      gameOptions: {
        damageMode: 'classic',
        startingLifepoints: 20,
        classicDeployment: true,
        quickStart: true,
      },
      drawTimestamp: TIMESTAMP,
    });
    expect(initial.phase).toBe('StartTurn');

    const state = applyAction(initial, { type: 'system:init', timestamp: TIMESTAMP });
    expect(state.phase).toBe('AttackPhase');
    expect(state.turnNumber).toBe(1);
  });

  it('skips DeploymentPhase entirely', () => {
    const state = createQuickStartState();

    // Should never enter DeploymentPhase
    expect(state.phase).not.toBe('DeploymentPhase');
    expect(state.phase).toBe('AttackPhase');
  });

  it('bots can play a complete game to gameOver', () => {
    let current = createQuickStartState(123);

    let actionCount = 0;
    const maxActions = 500;

    while (current.phase !== 'gameOver' && actionCount < maxActions) {
      const activeIdx = current.activePlayerIndex as 0 | 1;
      const action = computeBotAction(current, activeIdx, {
        strategy: 'random',
        seed: 123 + actionCount,
      });
      current = applyAction(current, action);
      actionCount++;
    }

    expect(current.phase).toBe('gameOver');
    expect(actionCount).toBeGreaterThan(0);
    expect(actionCount).toBeLessThan(maxActions);
  });

  it('is deterministic — same seed produces same battlefield', () => {
    const state1 = createQuickStartState(77);
    const state2 = createQuickStartState(77);

    expect(state1.players[0]!.battlefield).toEqual(state2.players[0]!.battlefield);
    expect(state1.players[1]!.battlefield).toEqual(state2.players[1]!.battlefield);
    expect(state1.players[0]!.hand).toEqual(state2.players[0]!.hand);
    expect(state1.players[1]!.hand).toEqual(state2.players[1]!.hand);
  });

  it('normal state (no quickStart) has empty battlefields', () => {
    const state = createNormalState();

    for (const player of state.players) {
      const filledSlots = player.battlefield.filter((s) => s !== null);
      expect(filledSlots).toHaveLength(0);
      expect(player.hand).toHaveLength(12);
    }
  });

  it('normal state enters DeploymentPhase via system:init', () => {
    const state = createNormalState();
    expect(state.phase).toBe('DeploymentPhase');
  });

  it('each battlefield position has correct row/col coordinates', () => {
    const state = createQuickStartState();
    const columns = state.params.columns;

    for (const player of state.players) {
      for (let idx = 0; idx < player.battlefield.length; idx++) {
        const slot = player.battlefield[idx] as BattlefieldCard;
        expect(slot).not.toBeNull();
        expect(slot.position.row).toBe(Math.floor(idx / columns));
        expect(slot.position.col).toBe(idx % columns);
      }
    }
  });

  it('each battlefield card has currentHp equal to card value', () => {
    const state = createQuickStartState();

    for (const player of state.players) {
      for (const slot of player.battlefield) {
        const bf = slot as BattlefieldCard;
        expect(bf.currentHp).toBe(bf.card.value);
      }
    }
  });
});
