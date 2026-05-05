import { describe, it, expect } from 'vitest';
import { createInitialState, GameProjection, createProjection } from '../src/index.ts';
import type { GameConfig } from '../src/index.ts';

function makeConfig(overrides?: Partial<GameConfig>): GameConfig {
  return {
    matchId: '00000000-0000-0000-0000-000000000001',
    players: [
      { id: '00000000-0000-0000-0000-000000000010', name: 'Alice' },
      { id: '00000000-0000-0000-0000-000000000020', name: 'Bob' },
    ],
    rngSeed: 42,
    drawTimestamp: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('GameProjection', () => {
  const config = makeConfig();
  const state = createInitialState(config);
  const proj = createProjection(state);

  it('exposes matchId', () => {
    expect(proj.matchId).toBe(config.matchId);
  });

  it('reports isGameOver as false for an active match', () => {
    expect(proj.isGameOver).toBe(false);
  });

  it('reports outcome as null for an active match', () => {
    expect(proj.outcome).toBeNull();
  });

  it('reports winnerIndex as null for an active match', () => {
    expect(proj.winnerIndex).toBeNull();
  });

  it('exposes activePlayerIndex', () => {
    expect(proj.activePlayerIndex).toBe(0);
  });

  it('exposes phase', () => {
    expect(typeof proj.phase).toBe('string');
  });

  it('exposes turnNumber', () => {
    expect(proj.turnNumber).toBe(0);
  });

  it('returns player IDs by index', () => {
    expect(proj.getPlayerId(0)).toBe(config.players[0].id);
    expect(proj.getPlayerId(1)).toBe(config.players[1].id);
  });

  it('returns player names by index', () => {
    expect(proj.getPlayerName(0)).toBe('Alice');
    expect(proj.getPlayerName(1)).toBe('Bob');
  });

  it('returns null for out-of-range player index', () => {
    expect(proj.getPlayerId(5)).toBeNull();
    expect(proj.getPlayerName(5)).toBeNull();
    expect(proj.getPlayerState(5)).toBeNull();
  });

  it('returns player state by index', () => {
    const p = proj.getPlayerState(0);
    expect(p).not.toBeNull();
    expect(p?.player.id).toBe(config.players[0].id);
  });

  it('isPlayerTurn returns true for active player', () => {
    const activeId = proj.getPlayerId(proj.activePlayerIndex);
    expect(activeId).not.toBeNull();
    expect(proj.isPlayerTurn(activeId!)).toBe(true);
  });

  it('isPlayerTurn returns false for inactive player', () => {
    const inactiveIndex = proj.activePlayerIndex === 0 ? 1 : 0;
    const inactiveId = proj.getPlayerId(inactiveIndex);
    expect(inactiveId).not.toBeNull();
    expect(proj.isPlayerTurn(inactiveId!)).toBe(false);
  });

  it('getPlayerIndex resolves player IDs to indices', () => {
    expect(proj.getPlayerIndex(config.players[0].id)).toBe(0);
    expect(proj.getPlayerIndex(config.players[1].id)).toBe(1);
    expect(proj.getPlayerIndex('unknown-id')).toBeNull();
  });

  it('getRawState returns the underlying GameState', () => {
    expect(proj.getRawState()).toBe(state);
  });

  describe('game over state', () => {
    it('reports isGameOver and outcome for a finished game', () => {
      const gameOverState = {
        ...state,
        phase: 'gameOver' as const,
        outcome: { winnerIndex: 1, victoryType: 'forfeit' as const, turnNumber: 5 },
      };
      const overProj = new GameProjection(gameOverState);
      expect(overProj.isGameOver).toBe(true);
      expect(overProj.outcome).toEqual({ winnerIndex: 1, victoryType: 'forfeit', turnNumber: 5 });
      expect(overProj.winnerIndex).toBe(1);
    });

    it('isPlayerTurn returns false when game is over', () => {
      const gameOverState = {
        ...state,
        phase: 'gameOver' as const,
        outcome: { winnerIndex: 0, victoryType: 'forfeit' as const, turnNumber: 3 },
      };
      const overProj = new GameProjection(gameOverState);
      expect(overProj.isPlayerTurn(config.players[0].id)).toBe(false);
    });
  });
});
