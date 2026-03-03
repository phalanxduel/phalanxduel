/**
 * Copyright © 2026 Mike Hall
 * Licensed under the GNU General Public License v3.0.
 */

import { describe, it, expect } from 'vitest';
import {
  createInitialState,
  getDeployTarget,
  advanceBackRow,
  isColumnFull,
  getReinforcementTarget,
} from '../src/state';
import { isValidTarget } from '../src/combat';
import type { GameConfig } from '../src/state';

function makeConfig(rows: number, columns: number): GameConfig {
  return {
    matchId: '00000000-0000-0000-0000-000000000001',
    players: [
      { id: '00000000-0000-0000-0000-000000000010', name: 'P1' },
      { id: '00000000-0000-0000-0000-000000000020', name: 'P2' },
    ],
    rngSeed: 42,
    gameOptions: { damageMode: 'classic', startingLifepoints: 20 },
    matchParams: {
      rows,
      columns,
      maxHandSize: columns,
      initialDraw: rows * columns + columns,
    },
    drawTimestamp: '2026-01-01T00:00:00.000Z',
  };
}

describe('dynamic grid: 3x3', () => {
  it('creates battlefield with 9 slots for 3x3 grid', () => {
    const state = createInitialState(makeConfig(3, 3));
    expect(state.players[0]!.battlefield).toHaveLength(9);
    expect(state.players[1]!.battlefield).toHaveLength(9);
  });

  it('draws correct number of initial cards (3*3+3=12)', () => {
    const state = createInitialState(makeConfig(3, 3));
    expect(state.players[0]!.hand).toHaveLength(12);
  });

  it('params reflect 3x3 configuration', () => {
    const state = createInitialState(makeConfig(3, 3));
    expect(state.params.rows).toBe(3);
    expect(state.params.columns).toBe(3);
  });
});

describe('dynamic grid: 1x4 (single row)', () => {
  it('creates battlefield with 4 slots', () => {
    const state = createInitialState(makeConfig(1, 4));
    expect(state.players[0]!.battlefield).toHaveLength(4);
  });
});

describe('dynamic grid: default 2x4', () => {
  it('creates standard 8-slot battlefield when no matchParams', () => {
    const config: GameConfig = {
      matchId: '00000000-0000-0000-0000-000000000001',
      players: [
        { id: '00000000-0000-0000-0000-000000000010', name: 'P1' },
        { id: '00000000-0000-0000-0000-000000000020', name: 'P2' },
      ],
      rngSeed: 42,
      drawTimestamp: '2026-01-01T00:00:00.000Z',
    };
    const state = createInitialState(config);
    expect(state.players[0]!.battlefield).toHaveLength(8);
    expect(state.params.rows).toBe(2);
    expect(state.params.columns).toBe(4);
  });
});

describe('isValidTarget with columns', () => {
  it('validates columns 0-2 for 3-column grid', () => {
    expect(isValidTarget([], 0, 3)).toBe(true);
    expect(isValidTarget([], 2, 3)).toBe(true);
    expect(isValidTarget([], 3, 3)).toBe(false);
  });

  it('validates columns 0-3 for default 4-column grid', () => {
    expect(isValidTarget([], 0)).toBe(true);
    expect(isValidTarget([], 3)).toBe(true);
    expect(isValidTarget([], 4)).toBe(false);
  });
});

describe('getDeployTarget with rows', () => {
  it('fills front row first in 3-row grid', () => {
    const bf = Array(9).fill(null);
    expect(getDeployTarget(bf, 0, 3, 3)).toBe(0); // row 0, col 0
  });

  it('fills row 1 when front is occupied in 3-row grid', () => {
    const bf = Array(9).fill(null);
    bf[0] = { card: { id: 'c1' }, position: { row: 0, col: 0 }, currentHp: 5, faceDown: false };
    expect(getDeployTarget(bf, 0, 3, 3)).toBe(3); // row 1, col 0
  });

  it('returns null when column is full in 3-row grid', () => {
    const bf = Array(9).fill(null);
    bf[0] = { card: { id: 'c1' }, position: { row: 0, col: 0 }, currentHp: 5, faceDown: false };
    bf[3] = { card: { id: 'c2' }, position: { row: 1, col: 0 }, currentHp: 5, faceDown: false };
    bf[6] = { card: { id: 'c3' }, position: { row: 2, col: 0 }, currentHp: 5, faceDown: false };
    expect(getDeployTarget(bf, 0, 3, 3)).toBeNull();
  });
});

describe('advanceBackRow with rows', () => {
  it('promotes row 1 to row 0 in 3-row grid', () => {
    const bf = Array(9).fill(null);
    bf[3] = { card: { id: 'c1' }, position: { row: 1, col: 0 }, currentHp: 5, faceDown: false };
    const result = advanceBackRow(bf, 0, 3, 3);
    expect(result[0]).toBeTruthy();
    expect(result[0]!.position.row).toBe(0);
    expect(result[3]).toBeNull();
  });

  it('cascades row 2->0 when row 1 is empty', () => {
    const bf = Array(9).fill(null);
    bf[6] = { card: { id: 'c2' }, position: { row: 2, col: 0 }, currentHp: 3, faceDown: false };
    const result = advanceBackRow(bf, 0, 3, 3);
    expect(result[0]).toBeTruthy();
    expect(result[0]!.position.row).toBe(0);
    expect(result[6]).toBeNull();
  });
});

describe('isColumnFull with rows', () => {
  it('returns false when 3-row column has empty slot', () => {
    const bf = Array(9).fill(null);
    bf[0] = { card: { id: 'c1' }, position: { row: 0, col: 0 }, currentHp: 5, faceDown: false };
    expect(isColumnFull(bf, 0, 3, 3)).toBe(false);
  });

  it('returns true when 3-row column is full', () => {
    const bf = Array(9).fill(null);
    bf[0] = { card: { id: 'c1' }, position: { row: 0, col: 0 }, currentHp: 5, faceDown: false };
    bf[3] = { card: { id: 'c2' }, position: { row: 1, col: 0 }, currentHp: 5, faceDown: false };
    bf[6] = { card: { id: 'c3' }, position: { row: 2, col: 0 }, currentHp: 5, faceDown: false };
    expect(isColumnFull(bf, 0, 3, 3)).toBe(true);
  });
});

describe('getReinforcementTarget with rows', () => {
  it('prioritizes back row in 3-row grid', () => {
    const bf = Array(9).fill(null);
    expect(getReinforcementTarget(bf, 0, 3, 3)).toBe(6); // row 2, col 0
  });

  it('returns middle row when back is full', () => {
    const bf = Array(9).fill(null);
    bf[6] = { card: { id: 'c1' }, position: { row: 2, col: 0 }, currentHp: 5, faceDown: false };
    expect(getReinforcementTarget(bf, 0, 3, 3)).toBe(3); // row 1, col 0
  });

  it('returns null when column is full', () => {
    const bf = Array(9).fill(null);
    bf[0] = { card: { id: 'c1' }, position: { row: 0, col: 0 }, currentHp: 5, faceDown: false };
    bf[3] = { card: { id: 'c2' }, position: { row: 1, col: 0 }, currentHp: 5, faceDown: false };
    bf[6] = { card: { id: 'c3' }, position: { row: 2, col: 0 }, currentHp: 5, faceDown: false };
    expect(getReinforcementTarget(bf, 0, 3, 3)).toBeNull();
  });
});
