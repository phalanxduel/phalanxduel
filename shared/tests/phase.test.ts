import { describe, it, expect } from 'vitest';
import type { GameState } from '../src/types.js';
import {
  isGameOver,
  isCompleted,
  isActionPhase,
  isDeploymentPhase,
  isReinforcementPhase,
  isAttackResolution,
  isStartTurn,
  GAME_PHASES,
  ACTION_PHASES,
} from '../src/phase.js';

function gs(phase: GameState['phase']): GameState {
  return { phase } as GameState;
}

function gsWithOutcome(phase: GameState['phase']): GameState {
  return { phase, outcome: { winnerIndex: 0, victoryType: 'forfeit' } } as unknown as GameState;
}

describe('isGameOver', () => {
  it('returns true for gameOver phase', () => {
    expect(isGameOver(gs('gameOver'))).toBe(true);
  });

  it('returns false for all other phases', () => {
    for (const phase of GAME_PHASES.filter((p) => p !== 'gameOver')) {
      expect(isGameOver(gs(phase))).toBe(false);
    }
  });

  it('accepts any object with a phase property (e.g. NarrationEvent)', () => {
    expect(isGameOver({ phase: 'gameOver' as GameState['phase'] })).toBe(true);
    expect(isGameOver({ phase: 'AttackPhase' as GameState['phase'] })).toBe(false);
  });
});

describe('isCompleted', () => {
  it('returns true when phase is gameOver', () => {
    expect(isCompleted(gs('gameOver'))).toBe(true);
  });

  it('returns true when outcome is present even if phase is not gameOver', () => {
    expect(isCompleted(gsWithOutcome('AttackPhase'))).toBe(true);
  });

  it('returns false for active phases with no outcome', () => {
    for (const phase of GAME_PHASES.filter((p) => p !== 'gameOver')) {
      expect(isCompleted(gs(phase))).toBe(false);
    }
  });
});

describe('isActionPhase', () => {
  it('returns true for all ACTION_PHASES', () => {
    for (const phase of ACTION_PHASES) {
      expect(isActionPhase(gs(phase))).toBe(true);
    }
  });

  it('returns false for non-action phases', () => {
    const nonAction = GAME_PHASES.filter((p) => !ACTION_PHASES.includes(p));
    for (const phase of nonAction) {
      expect(isActionPhase(gs(phase))).toBe(false);
    }
  });
});

describe('isDeploymentPhase', () => {
  it('returns true only for DeploymentPhase', () => {
    expect(isDeploymentPhase(gs('DeploymentPhase'))).toBe(true);
    expect(isDeploymentPhase(gs('AttackPhase'))).toBe(false);
    expect(isDeploymentPhase(gs('gameOver'))).toBe(false);
  });
});

describe('isReinforcementPhase', () => {
  it('returns true only for ReinforcementPhase', () => {
    expect(isReinforcementPhase(gs('ReinforcementPhase'))).toBe(true);
    expect(isReinforcementPhase(gs('AttackPhase'))).toBe(false);
    expect(isReinforcementPhase(gs('gameOver'))).toBe(false);
  });
});

describe('isAttackResolution', () => {
  it('returns true only for AttackResolution', () => {
    expect(isAttackResolution(gs('AttackResolution'))).toBe(true);
    expect(isAttackResolution(gs('AttackPhase'))).toBe(false);
    expect(isAttackResolution(gs('gameOver'))).toBe(false);
  });
});

describe('isStartTurn', () => {
  it('returns true only for StartTurn', () => {
    expect(isStartTurn(gs('StartTurn'))).toBe(true);
    expect(isStartTurn(gs('AttackPhase'))).toBe(false);
    expect(isStartTurn(gs('gameOver'))).toBe(false);
  });
});

describe('GAME_PHASES', () => {
  it('contains all 9 phases including gameOver', () => {
    expect(GAME_PHASES).toHaveLength(9);
    expect(GAME_PHASES).toContain('gameOver');
  });
});

describe('ACTION_PHASES', () => {
  it('contains exactly DeploymentPhase, AttackPhase, ReinforcementPhase', () => {
    expect(ACTION_PHASES).toHaveLength(3);
    expect(ACTION_PHASES).toContain('DeploymentPhase');
    expect(ACTION_PHASES).toContain('AttackPhase');
    expect(ACTION_PHASES).toContain('ReinforcementPhase');
  });
});
