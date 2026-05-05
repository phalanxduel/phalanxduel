/**
 * Copyright © 2026 Mike Hall
 * Licensed under the GNU Affero General Public License v3.0.
 */

/**
 * The Phalanx Duel Game Engine provides the core deterministic rules for tactical card combat.
 *
 * @remarks
 * This package exposes pure functions for game rule evaluation. Every transition is
 * side-effect free: no I/O, no randomness (RNG is injected), and no transport.
 * This architecture ensures every game is 100% replayable and verifiable.
 *
 * @packageDocumentation
 */

export const ENGINE_VERSION = '0.2.3';

// Core State & Logic
export { createDeck, shuffleDeck } from './deck.js';
export {
  createInitialState,
  drawCards,
  deployCard,
  getPlayer,
  setPlayer,
  getDeployTarget,
  advanceBackRow,
  isColumnFull,
  getReinforcementTarget,
} from './state.js';
export { resolveAttack, isValidTarget, getBaseAttackDamage, resetColumnHp } from './combat.js';
export { checkVictory, validateAction, applyAction, getValidActions } from './turns.js';
export type { ApplyActionOptions } from './turns.js';
export { replayGame } from './replay.js';
export type { ReplayResult } from './replay.js';
export type { GameConfig } from './state.js';

// State machine canonical spec — used for testing and documentation
export {
  STATE_MACHINE,
  GAME_PHASES,
  ACTION_PHASES,
  transitionsFrom,
  transitionsTo,
  findTransition,
} from './state-machine.js';
export type { StateTransition, TransitionTrigger } from './state-machine.js';

// Bot AI
export { computeBotAction } from './bot.js';
export type { BotConfig } from './bot.js';

// Event derivation
export { deriveEventsFromEntry } from './events.js';

// Attack preview (simulate without applying)
export { simulateAttack } from './combat-preview.js';
export type { AttackPreview, AttackPreviewVerdict } from './combat-preview.js';

// State projection adapter
export { GameProjection, createProjection } from './projection.js';
