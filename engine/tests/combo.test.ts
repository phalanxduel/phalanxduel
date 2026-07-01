import { describe, it, expect } from 'vitest';
import { applyAction, createInitialState } from '../src/index';

describe('Combo Tracking', () => {
  it('identifies deep breakthrough combos correctly', () => {
    const state = createInitialState({
      matchId: 'match',
      players: [
        { id: 'p1', name: 'p1' },
        { id: 'p2', name: 'p2' },
      ],
      rngSeed: 42,
      gameOptions: {
        damageMode: 'classic',
        startingLifepoints: 20,
        quickStart: true,
      },
      createdAt: '2026-06-30T19:54:00Z',
      drawTimestamp: 1000,
    });

    // Setup a combo: P1 attacks a weak column of P2 that has a reinforcer
    state.players[1].battlefield[0] = {
      card: { id: 'tgt1-c', suit: 'HEARTS', face: '2', value: 2, type: 'number' },
      currentHp: 2,
      position: { row: 0, col: 0 },
      faceDown: false,
    };
    state.players[1].battlefield[4] = {
      card: { id: 'tgt2-c', suit: 'SPADES', face: '3', value: 3, type: 'number' },
      currentHp: 3,
      position: { row: 1, col: 0 },
      faceDown: false,
    };

    state.players[0].battlefield[0] = {
      card: { id: 'atk-c', suit: 'CLUBS', face: 'K', value: 10, type: 'face' },
      currentHp: 10,
      position: { row: 0, col: 0 },
      faceDown: false,
    };

    state.activePlayerIndex = 0;
    state.phase = 'AttackPhase';

    const result = applyAction(state, {
      type: 'attack',
      playerIndex: 0,
      attackingColumn: 0,
      defendingColumn: 0,
      timestamp: '2026-06-30T19:54:00Z',
    });

    const comboEvents = result.transactionLog.filter(
      (e) =>
        e.details?.type === 'attack' &&
        e.details.combat?.comboCount &&
        e.details.combat.comboCount > 1,
    );

    expect(comboEvents.length).toBeGreaterThan(0);
    expect(comboEvents[0].details?.combat?.comboCount).toBe(2);
  });
});
