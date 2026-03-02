import { describe, it, expect } from 'vitest';
import type { GameState } from '@phalanxduel/shared';
import { getPhaseLabel, getTurnIndicatorText, getActionButtons } from '../src/game';

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

describe('getActionButtons', () => {
  it('returns pass+forfeit+help during AttackPhase on my turn (no attacker)', () => {
    const gs = makeMinimalGs({ phase: 'AttackPhase' as GameState['phase'], activePlayerIndex: 0 });
    const buttons = getActionButtons({
      gs,
      isSpectator: false,
      myIdx: 0,
      selectedAttacker: null,
      showHelp: false,
    });
    const labels = buttons.map((b) => b.label);
    expect(labels).toEqual(['Pass', 'Forfeit', 'Help ?']);
  });

  it('includes Cancel when attacker is selected during AttackPhase', () => {
    const gs = makeMinimalGs({ phase: 'AttackPhase' as GameState['phase'], activePlayerIndex: 0 });
    const buttons = getActionButtons({
      gs,
      isSpectator: false,
      myIdx: 0,
      selectedAttacker: { row: 0, col: 1 },
      showHelp: false,
    });
    const labels = buttons.map((b) => b.label);
    expect(labels).toEqual(['Cancel', 'Pass', 'Forfeit', 'Help ?']);
    expect(buttons[0]?.testId).toBe('combat-cancel-btn');
  });

  it('returns only forfeit+help during ReinforcementPhase on my turn', () => {
    const gs = makeMinimalGs({
      phase: 'ReinforcementPhase' as GameState['phase'],
      activePlayerIndex: 0,
    });
    const buttons = getActionButtons({
      gs,
      isSpectator: false,
      myIdx: 0,
      selectedAttacker: null,
      showHelp: false,
    });
    const labels = buttons.map((b) => b.label);
    expect(labels).toEqual(['Forfeit', 'Help ?']);
  });

  it('returns only help for spectators', () => {
    const gs = makeMinimalGs({ phase: 'AttackPhase' as GameState['phase'], activePlayerIndex: 0 });
    const buttons = getActionButtons({
      gs,
      isSpectator: true,
      myIdx: 0,
      selectedAttacker: null,
      showHelp: false,
    });
    const labels = buttons.map((b) => b.label);
    expect(labels).toEqual(['Help ?']);
  });

  it('returns only help when not my turn', () => {
    const gs = makeMinimalGs({ phase: 'AttackPhase' as GameState['phase'], activePlayerIndex: 1 });
    const buttons = getActionButtons({
      gs,
      isSpectator: false,
      myIdx: 0,
      selectedAttacker: null,
      showHelp: false,
    });
    const labels = buttons.map((b) => b.label);
    expect(labels).toEqual(['Help ?']);
  });

  it('help label is "Exit Help" when showHelp=true', () => {
    const gs = makeMinimalGs({ phase: 'AttackPhase' as GameState['phase'], activePlayerIndex: 0 });
    const buttons = getActionButtons({
      gs,
      isSpectator: false,
      myIdx: 0,
      selectedAttacker: null,
      showHelp: true,
    });
    const helpBtn = buttons.find((b) => b.label === 'Exit Help');
    expect(helpBtn).toBeDefined();
  });

  it('forfeit button has btn-forfeit className', () => {
    const gs = makeMinimalGs({ phase: 'AttackPhase' as GameState['phase'], activePlayerIndex: 0 });
    const buttons = getActionButtons({
      gs,
      isSpectator: false,
      myIdx: 0,
      selectedAttacker: null,
      showHelp: false,
    });
    const forfeit = buttons.find((b) => b.label === 'Forfeit');
    expect(forfeit?.className).toBe('btn-forfeit');
    expect(forfeit?.testId).toBe('combat-forfeit-btn');
  });

  it('pass button has correct testId', () => {
    const gs = makeMinimalGs({ phase: 'AttackPhase' as GameState['phase'], activePlayerIndex: 0 });
    const buttons = getActionButtons({
      gs,
      isSpectator: false,
      myIdx: 0,
      selectedAttacker: null,
      showHelp: false,
    });
    const pass = buttons.find((b) => b.label === 'Pass');
    expect(pass?.testId).toBe('combat-pass-btn');
  });
});
