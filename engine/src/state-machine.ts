/**
 * Copyright © 2026 Mike Hall
 * Licensed under the GNU Affero General Public License v3.0.
 *
 * Canonical state machine definition for Phalanx Duel.
 *
 * This module is the single source of truth for valid game phase transitions.
 * It should be kept in sync with the normative rules in docs/RULES.md and the
 * descriptive architecture documentation in docs/system/ARCHITECTURE.md.
 * Tests in engine/tests/state-machine.test.ts verify that the engine implements
 * every edge in this graph.
 */

import type { GamePhase, Action, StateTransition, TransitionTrigger } from '@phalanxduel/shared';
export type { StateTransition, TransitionTrigger };

export type ActionType = Action['type'];

/**
 * All valid state transitions in Phalanx Duel.
 *
 * Sources:
 *   - docs/RULES.md
 *   - docs/system/ARCHITECTURE.md
 *   - engine/src/turns.ts (applyAction, validateAction)
 */
export const STATE_MACHINE: StateTransition[] = [
  // --- StartTurn ---
  {
    from: 'StartTurn',
    to: 'DeploymentPhase',
    trigger: 'system:init',
    action: 'system:init',
    description: 'Match begins; players prepare for deployment',
  },
  {
    from: 'StartTurn',
    to: 'AttackPhase',
    trigger: 'system:init',
    action: 'system:init',
    description: 'Match begins directly in attack phase when deployment is disabled',
  },
  {
    from: 'StartTurn',
    to: 'AttackPhase',
    trigger: 'system:advance',
    description: 'Advance from start-turn bookkeeping into the next attack phase',
  },
  {
    from: 'StartTurn',
    to: 'gameOver',
    trigger: 'system:victory',
    description: 'Post-turn victory check ends the match before the next attack phase',
  },
  {
    from: 'StartTurn',
    to: 'gameOver',
    trigger: 'forfeit',
    action: 'forfeit',
    description: 'Player forfeits at the start of a turn',
  },

  // --- Common system actions (Allowed in most phases for robustness) ---
  {
    from: 'DeploymentPhase',
    to: 'DeploymentPhase',
    trigger: 'system:init',
    action: 'system:init',
    description: 'Redundant init in deployment phase (no-op)',
  },
  {
    from: 'AttackPhase',
    to: 'AttackPhase',
    trigger: 'system:init',
    action: 'system:init',
    description: 'Redundant init in attack phase (no-op)',
  },
  {
    from: 'ReinforcementPhase',
    to: 'ReinforcementPhase',
    trigger: 'system:init',
    action: 'system:init',
    description: 'Redundant init in reinforcement phase (no-op)',
  },

  // --- DeploymentPhase ---
  {
    from: 'DeploymentPhase',
    to: 'DeploymentPhase',
    trigger: 'deploy',
    action: 'deploy',
    description: 'Player deploys a card; alternate players',
  },
  {
    from: 'DeploymentPhase',
    to: 'AttackPhase',
    trigger: 'deploy:complete',
    action: 'deploy',
    description: 'All slots filled; transition to main turn loop',
  },
  {
    from: 'DeploymentPhase',
    to: 'gameOver',
    trigger: 'forfeit',
    action: 'forfeit',
    description: 'Active player forfeits during deployment',
  },

  // --- AttackPhase ---
  {
    from: 'AttackPhase',
    to: 'AttackResolution',
    trigger: 'attack',
    action: 'attack',
    description: 'Active player declares an attack; transition to resolution',
  },
  {
    from: 'AttackPhase',
    to: 'AttackResolution',
    trigger: 'pass',
    action: 'pass',
    description: 'Active player passes; transition to resolution (no damage)',
  },
  {
    from: 'AttackPhase',
    to: 'gameOver',
    trigger: 'forfeit',
    action: 'forfeit',
    description: 'Active player forfeits during attack phase',
  },

  // --- AttackResolution ---
  {
    from: 'AttackResolution',
    to: 'CleanupPhase',
    trigger: 'system:advance',
    description: 'Attack damage resolved; transition to cleanup',
  },
  {
    from: 'AttackResolution',
    to: 'gameOver',
    trigger: 'attack:victory',
    description: 'Attack resolution triggers an immediate victory',
  },
  {
    from: 'AttackResolution',
    to: 'gameOver',
    trigger: 'forfeit',
    action: 'forfeit',
    description: 'Active player forfeits during attack resolution',
  },

  // --- CleanupPhase ---
  {
    from: 'CleanupPhase',
    to: 'ReinforcementPhase',
    trigger: 'system:advance',
    description: 'Cards moved to graveyard; column collapsed; transition to reinforcement',
  },
  {
    from: 'CleanupPhase',
    to: 'gameOver',
    trigger: 'forfeit',
    action: 'forfeit',
    description: 'Active player forfeits during cleanup',
  },

  // --- ReinforcementPhase ---
  {
    from: 'ReinforcementPhase',
    to: 'ReinforcementPhase',
    trigger: 'reinforce',
    action: 'reinforce',
    description: 'Defender places a card; reinforcement context updated',
  },
  {
    from: 'ReinforcementPhase',
    to: 'DrawPhase',
    trigger: 'system:advance',
    description: 'No reinforcement possible; skip directly to draw phase',
  },
  {
    from: 'ReinforcementPhase',
    to: 'DrawPhase',
    trigger: 'reinforce:complete',
    action: 'reinforce',
    description: 'Reinforcement window closed; transition to draw',
  },
  {
    from: 'ReinforcementPhase',
    to: 'DrawPhase',
    trigger: 'pass',
    action: 'pass',
    description: 'Defender chooses not to reinforce; transition to draw',
  },
  {
    from: 'ReinforcementPhase',
    to: 'gameOver',
    trigger: 'forfeit',
    action: 'forfeit',
    description: 'Active defender forfeits during reinforcement',
  },

  // --- DrawPhase → EndTurn ---
  {
    from: 'DrawPhase',
    to: 'EndTurn',
    trigger: 'system:advance',
    description: 'Cards drawn to maxHandSize; transition to end of turn',
  },
  {
    from: 'DrawPhase',
    to: 'gameOver',
    trigger: 'forfeit',
    action: 'forfeit',
    description: 'Active player forfeits during draw phase',
  },

  // --- EndTurn → StartTurn (Next Turn) ---
  {
    from: 'EndTurn',
    to: 'StartTurn',
    trigger: 'system:advance',
    description: 'Turn context cleared; activePlayerIndex updated; turnNumber incremented',
  },
  {
    from: 'EndTurn',
    to: 'gameOver',
    trigger: 'forfeit',
    action: 'forfeit',
    description: 'Active player forfeits at end of turn',
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

/**
 * Returns true if an exact (from, trigger, to) transition exists.
 */
export function hasTransition(from: GamePhase, trigger: TransitionTrigger, to: GamePhase): boolean {
  return STATE_MACHINE.some((t) => t.from === from && t.trigger === trigger && t.to === to);
}

/**
 * Throws when an exact (from, trigger, to) transition is not declared.
 */
export function assertTransition(from: GamePhase, trigger: TransitionTrigger, to: GamePhase): void {
  if (hasTransition(from, trigger, to)) return;

  const allowed = transitionsFrom(from)
    .map((t) => `${t.trigger}->${t.to}`)
    .join(', ');

  throw new Error(
    `Invalid phase transition ${from} --${trigger}--> ${to}. Allowed: ${allowed || '(none)'}`,
  );
}

/**
 * Returns true if the phase has at least one transition mapped to the given external action.
 */
export function canHandleAction(from: GamePhase, action: ActionType): boolean {
  return STATE_MACHINE.some((t) => t.from === from && t.action === action);
}
