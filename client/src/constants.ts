import type { GamePhase } from '@phalanxduel/shared';

/**
 * Canonical display labels for all game phases.
 * Shared between HUD (InfoBar) and Narration (NarrationOverlay).
 */
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

/**
 * Detailed phase labels for the HUD.
 */
export const HUD_PHASE_LABELS: Partial<Record<GamePhase, string>> = {
  StartTurn: 'Turn Start',
  DeploymentPhase: 'Deploy Units',
  AttackPhase: 'Combat Phase',
  ReinforcementPhase: 'Reinforce Units',
  gameOver: 'Victory & Defeat',
};
