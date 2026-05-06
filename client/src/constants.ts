import type { GamePhase } from '@phalanxduel/shared';

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
