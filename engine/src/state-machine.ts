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
  // --- Setup → Deployment ---
  {
    from: 'setup',
    to: 'deployment',
    trigger: 'system:init',
    description:
      'Engine draws 12 cards per player and sets phase to deployment after createInitialState + drawCards',
  },

  // --- Deployment ---
  {
    from: 'deployment',
    to: 'deployment',
    trigger: 'deploy',
    description:
      'Active player deploys a card; activePlayerIndex alternates until both players have 8 cards',
  },
  {
    from: 'deployment',
    to: 'combat',
    trigger: 'deploy:complete',
    description:
      'When both players reach 8 battlefield cards, phase transitions to combat; deploying player takes first combat turn',
  },

  // --- Combat ---
  {
    from: 'combat',
    to: 'combat',
    trigger: 'pass',
    description: 'Active player passes; activePlayerIndex switches and turnNumber increments',
  },
  {
    from: 'combat',
    to: 'combat',
    trigger: 'attack',
    description:
      'Attack resolves with no card destroyed (or column already full / hand empty); turns alternate',
  },
  {
    from: 'combat',
    to: 'reinforcement',
    trigger: 'attack:reinforcement',
    description:
      'Attack destroys a defender card, column not full, defender has hand cards; reinforcement phase begins',
  },
  {
    from: 'combat',
    to: 'gameOver',
    trigger: 'attack:victory',
    description: 'Attack triggers LP depletion or card depletion victory; outcome is set',
  },
  {
    from: 'combat',
    to: 'gameOver',
    trigger: 'forfeit',
    description: 'Active player forfeits; opponent wins with victoryType=forfeit',
  },

  // --- Reinforcement ---
  {
    from: 'reinforcement',
    to: 'reinforcement',
    trigger: 'reinforce',
    description:
      'Defender places a card; if column not full and hand not empty, reinforcement continues',
  },
  {
    from: 'reinforcement',
    to: 'combat',
    trigger: 'reinforce:complete',
    description:
      "Reinforcement ends (column full or hand empty); defender draws to 4 and combat resumes with attacker's opponent",
  },
  {
    from: 'reinforcement',
    to: 'gameOver',
    trigger: 'forfeit',
    description:
      'Active defender forfeits during reinforcement; attacker wins with victoryType=forfeit',
  },
];

/**
 * Valid phases a game can be in.
 * Ordered from initial to terminal.
 */
export const GAME_PHASES: GamePhase[] = [
  'setup',
  'deployment',
  'combat',
  'reinforcement',
  'gameOver',
];

/**
 * Phases from which a player can take a direct action.
 * (setup and gameOver are terminal/passive — no player actions accepted)
 */
export const ACTION_PHASES: GamePhase[] = ['deployment', 'combat', 'reinforcement'];

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
