export declare const ENGINE_VERSION = "0.1.0";
export { createDeck, shuffleDeck } from './deck.js';
export { createInitialState, drawCards, deployCard, getDeployTarget, advanceBackRow, isColumnFull, getReinforcementTarget } from './state.js';
export { resolveAttack, isValidTarget, getBaseAttackDamage, resetColumnHp } from './combat.js';
export { checkVictory, validateAction, applyAction } from './turns.js';
export type { ApplyActionOptions } from './turns.js';
export { replayGame } from './replay.js';
export type { ReplayResult } from './replay.js';
export type { GameConfig } from './state.js';
//# sourceMappingURL=index.d.ts.map