import { describe, it, expect } from 'vitest';
import type { GameState } from '@phalanxduel/shared';
import { getPhaseLabel, getTurnIndicatorText } from '../src/game';

function makeMinimalGs(overrides: Partial<GameState> = {}): GameState {
  return {
    players: [
      {
        player: { name: 'Alice' },
        lifepoints: 20,
        hand: [],
        drawpile: [],
        drawpileCount: 0,
        handCount: 0,
        battlefield: Array(8).fill(null),
        discardPile: [],
      },
      {
        player: { name: 'Bob' },
        lifepoints: 20,
        hand: [],
        drawpile: [],
        drawpileCount: 0,
        handCount: 0,
        battlefield: Array(8).fill(null),
        discardPile: [],
      },
    ],
    activePlayerIndex: 0,
    phase: 'AttackPhase',
    turnNumber: 1,
    ...overrides,
  } as GameState;
}

describe('getPhaseLabel', () => {
  it('returns "Deployment" for DeploymentPhase', () => {
    const gs = makeMinimalGs({ phase: 'DeploymentPhase' as GameState['phase'] });
    expect(getPhaseLabel(gs)).toBe('Deployment');
  });

  it('returns "Reinforce col N" for ReinforcementPhase', () => {
    const gs = makeMinimalGs({
      phase: 'ReinforcementPhase' as GameState['phase'],
      reinforcement: { column: 2, attackerIndex: 0 },
    });
    expect(getPhaseLabel(gs)).toBe('Reinforce col 3');
  });

  it('returns "Reinforce col 1" when reinforcement is missing', () => {
    const gs = makeMinimalGs({
      phase: 'ReinforcementPhase' as GameState['phase'],
    });
    expect(getPhaseLabel(gs)).toBe('Reinforce col 1');
  });

  it('returns phase name as-is for AttackPhase', () => {
    const gs = makeMinimalGs({ phase: 'AttackPhase' as GameState['phase'] });
    expect(getPhaseLabel(gs)).toBe('AttackPhase');
  });
});

describe('getTurnIndicatorText', () => {
  it('returns player name for spectators with isMyTurn=false', () => {
    const gs = makeMinimalGs({ activePlayerIndex: 0 });
    const result = getTurnIndicatorText(gs, true, 1);
    expect(result.text).toBe("Alice's turn");
    expect(result.isMyTurn).toBe(false);
  });

  it('returns "Your turn" when active player matches myIdx', () => {
    const gs = makeMinimalGs({ activePlayerIndex: 0 });
    const result = getTurnIndicatorText(gs, false, 0);
    expect(result.text).toBe('Your turn');
    expect(result.isMyTurn).toBe(true);
  });

  it('returns "Opponent\'s turn" when not active', () => {
    const gs = makeMinimalGs({ activePlayerIndex: 1 });
    const result = getTurnIndicatorText(gs, false, 0);
    expect(result.text).toBe("Opponent's turn");
    expect(result.isMyTurn).toBe(false);
  });

  it('returns "Reinforce your column" during ReinforcementPhase when active', () => {
    const gs = makeMinimalGs({
      phase: 'ReinforcementPhase' as GameState['phase'],
      activePlayerIndex: 0,
    });
    const result = getTurnIndicatorText(gs, false, 0);
    expect(result.text).toBe('Reinforce your column');
    expect(result.isMyTurn).toBe(true);
  });

  it('returns "Opponent reinforcing" during ReinforcementPhase when not active', () => {
    const gs = makeMinimalGs({
      phase: 'ReinforcementPhase' as GameState['phase'],
      activePlayerIndex: 1,
    });
    const result = getTurnIndicatorText(gs, false, 0);
    expect(result.text).toBe('Opponent reinforcing');
    expect(result.isMyTurn).toBe(false);
  });

  it('falls back to "Player N" when player name is missing', () => {
    const gs = makeMinimalGs({ activePlayerIndex: 1 });
    // Remove the player at index 1
    gs.players[1] = undefined as never;
    const result = getTurnIndicatorText(gs, true, 0);
    expect(result.text).toBe("Player 2's turn");
    expect(result.isMyTurn).toBe(false);
  });
});
