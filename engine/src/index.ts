export const ENGINE_VERSION = '0.1.0';

// The engine package exposes pure, deterministic functions for game rule
// evaluation. All functions are side-effect free: no I/O, no randomness
// (RNG is injected), no transport. This makes every game state transition
// fully testable and replayable.

export { createDeck, shuffleDeck } from './deck.js';
export { createInitialState, drawCards, deployCard, getDeployTarget, advanceBackRow, isColumnFull, getReinforcementTarget } from './state.js';
export { resolveAttack, isValidTarget, getBaseAttackDamage, resetColumnHp } from './combat.js';
export { checkVictory, validateAction, applyAction } from './turns.js';
export type { ApplyActionOptions } from './turns.js';
export { replayGame } from './replay.js';
export type { ReplayResult } from './replay.js';
export type { GameConfig } from './state.js';
