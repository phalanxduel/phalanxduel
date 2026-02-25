/**
 * Copyright © 2026 Mike Hall
 * Licensed under the GNU General Public License v3.0.
 *
 * Canonical state machine definition for Phalanx Duel.
 *
 * This module is the single source of truth for valid game phase transitions.
 * It is derived directly from docs/system/GAME_STATE_MACHINE.md and should be
 * kept in sync with that diagram. Tests in engine/tests/state-machine.test.ts
 * verify that the engine implements every edge in this graph.
 */

import type { GamePhase } from '@phalanxduel/shared';

/**
 * The action types that can trigger a phase transition.
 * "system" covers internal engine transitions (e.g. deployment completion).
 */
export type TransitionTrigger =
  | 'deploy'
  | 'deploy:complete'
  | 'attack'
  | 'attack:reinforcement'
  | 'attack:victory'
  | 'pass'
  | 'reinforce'
  | 'reinforce:complete'
  | 'forfeit'
  | 'system:init';

/**
 * A single edge in the state machine.
 */
export interface StateTransition {
  /** The phase the game must be in for this transition to fire. */
  from: GamePhase;
  /** The phase the game will be in after the transition. */
  to: GamePhase;
  /** The trigger that causes the transition. */
  trigger: TransitionTrigger;
  /** Human-readable description matching GAME_STATE_MACHINE.md. */
  description: string;
}

/**
 * All valid state transitions in Phalanx Duel.
 *
 * Indexed by `${from}:${trigger}` for fast lookup in tests.
 *
 * Sources:
 *   - docs/system/GAME_STATE_MACHINE.md
 *   - engine/src/turns.ts (applyAction, validateAction)
 */
export const STATE_MACHINE: StateTransition[] = [
  // --- StartTurn → DeploymentPhase / AttackPhase ---
  {
    from: 'StartTurn',
    to: 'DeploymentPhase',
    trigger: 'system:init',
    description: 'Match begins; players prepare for deployment',
  },

  // --- DeploymentPhase ---
  {
    from: 'DeploymentPhase',
    to: 'DeploymentPhase',
    trigger: 'deploy',
    description: 'Player deploys a card; alternate players',
  },
  {
    from: 'DeploymentPhase',
    to: 'AttackPhase',
    trigger: 'deploy:complete',
    description: 'All slots filled; transition to main turn loop',
  },

  // --- AttackPhase ---
  {
    from: 'AttackPhase',
    to: 'AttackResolution',
    trigger: 'attack',
    description: 'Active player declares an attack; transition to resolution',
  },
  {
    from: 'AttackPhase',
    to: 'AttackResolution',
    trigger: 'pass',
    description: 'Active player passes; transition to resolution (no damage)',
  },
  {
    from: 'AttackPhase',
    to: 'gameOver',
    trigger: 'forfeit',
    description: 'Active player forfeits during attack phase',
  },

  // --- AttackResolution → CleanupPhase ---
  {
    from: 'AttackResolution',
    to: 'CleanupPhase',
    trigger: 'deploy:complete', // Reuse trigger for internal completion
    description: 'Attack damage resolved; transition to cleanup',
  },

  // --- CleanupPhase → ReinforcementPhase ---
  {
    from: 'CleanupPhase',
    to: 'ReinforcementPhase',
    trigger: 'deploy:complete',
    description: 'Cards moved to graveyard; column collapsed; transition to reinforcement',
  },

  // --- ReinforcementPhase ---
  {
    from: 'ReinforcementPhase',
    to: 'ReinforcementPhase',
    trigger: 'reinforce',
    description: 'Defender places a card; reinforcement context updated',
  },
  {
    from: 'ReinforcementPhase',
    to: 'DrawPhase',
    trigger: 'reinforce:complete',
    description: 'Reinforcement window closed; transition to draw',
  },
  {
    from: 'ReinforcementPhase',
    to: 'gameOver',
    trigger: 'forfeit',
    description: 'Active defender forfeits during reinforcement',
  },

  // --- DrawPhase → EndTurn ---
  {
    from: 'DrawPhase',
    to: 'EndTurn',
    trigger: 'deploy:complete',
    description: 'Cards drawn to maxHandSize; transition to end of turn',
  },

  // --- EndTurn → StartTurn (Next Turn) ---
  {
    from: 'EndTurn',
    to: 'StartTurn',
    trigger: 'deploy:complete',
    description: 'Turn context cleared; activePlayerIndex updated; turnNumber incremented',
  },
];

/**
 * Valid phases a game can be in.
 * Ordered from initial to terminal.
 */
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

/**
 * Phases from which a player can take a direct action.
 */
export const ACTION_PHASES: GamePhase[] = ['DeploymentPhase', 'AttackPhase', 'ReinforcementPhase'];

/**
 * Returns all transitions that originate from a given phase.
 */
export function transitionsFrom(phase: GamePhase): StateTransition[] {
  return STATE_MACHINE.filter((t) => t.from === phase);
}

/**
 * Returns all transitions that end in a given phase.
 */
export function transitionsTo(phase: GamePhase): StateTransition[] {
  return STATE_MACHINE.filter((t) => t.to === phase);
}

/**
 * Returns the transition for a given (from, trigger) pair, or undefined if invalid.
 */
export function findTransition(
  from: GamePhase,
  trigger: TransitionTrigger,
): StateTransition | undefined {
  return STATE_MACHINE.find((t) => t.from === from && t.trigger === trigger);
}
