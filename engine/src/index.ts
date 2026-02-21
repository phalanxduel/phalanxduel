/**
 * Copyright © 2026 Mike Hall
 * Licensed under the GNU General Public License v3.0.
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

export const ENGINE_VERSION = '0.1.0';

// Core State & Logic
export { createDeck, shuffleDeck } from './deck.js';
export { createInitialState, drawCards, deployCard, getDeployTarget, advanceBackRow, isColumnFull, getReinforcementTarget } from './state.js';
export { resolveAttack, isValidTarget, getBaseAttackDamage, resetColumnHp } from './combat.js';
export { checkVictory, validateAction, applyAction } from './turns.js';
export type { ApplyActionOptions } from './turns.js';
export { replayGame } from './replay.js';
export type { ReplayResult } from './replay.js';
export type { GameConfig } from './state.js';
