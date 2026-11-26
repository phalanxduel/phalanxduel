import type { GamePhase } from '@phalanxduel/shared';

/**
 * Canonical display labels for all game phases.
 * Shared between the HUD and narration.
 */
export const HUD_PHASE_LABELS: Record<string, string> = {
  DeploymentPhase: 'DEPLOYMENT',
  ReinforcementPhase: 'REINFORCEMENT',
  AttackPhase: 'COMBAT',
  gameOver: 'TERMINATED',
};

export const PHASE_DISPLAY: Record<GamePhase, string> = {
  StartTurn: 'Start',
  DeploymentPhase: 'Deployment',
  AttackPhase: 'Combat',
  AttackResolution: 'Resolution',
  CleanupPhase: 'Cleanup',
  ReinforcementPhase: 'Reinforcement',
  DrawPhase: 'Draw',
  EndTurn: 'End',
  gameOver: 'Game Over',
};
