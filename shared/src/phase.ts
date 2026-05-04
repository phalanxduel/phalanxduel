/**
 * Copyright © 2026 Mike Hall
 * Licensed under the GNU Affero General Public License v3.0.
 */

import type { GamePhase, GameState } from './types.js';

export const GAME_PHASES: GamePhase[] = [
  'StartTurn',
  'DeploymentPhase',
  'AttackPhase',
  'AttackResolution',
  'CleanupPhase',
  'ReinforcementPhase',
  'DrawPhase',
  'EndTurn',
  'gameOver',
];

export const ACTION_PHASES: GamePhase[] = ['DeploymentPhase', 'AttackPhase', 'ReinforcementPhase'];

const ACTION_PHASE_SET = new Set<GamePhase>(ACTION_PHASES);

export function isGameOver(gs: { phase: GamePhase }): boolean {
  return gs.phase === 'gameOver';
}

export function isCompleted(gs: GameState): boolean {
  return gs.phase === 'gameOver' || gs.outcome != null;
}

export function isActionPhase(gs: { phase: GamePhase }): boolean {
  return ACTION_PHASE_SET.has(gs.phase);
}

export function isDeploymentPhase(gs: { phase: GamePhase }): boolean {
  return gs.phase === 'DeploymentPhase';
}

export function isReinforcementPhase(gs: { phase: GamePhase }): boolean {
  return gs.phase === 'ReinforcementPhase';
}

export function isAttackResolution(gs: { phase: GamePhase }): boolean {
  return gs.phase === 'AttackResolution';
}

export function isStartTurn(gs: { phase: GamePhase }): boolean {
  return gs.phase === 'StartTurn';
}
