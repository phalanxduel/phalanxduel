import type { GameState, Action } from '@phalanxduel/shared';
import type { GameConfig } from './state.js';
export interface ReplayResult {
    finalState: GameState;
    valid: boolean;
    failedAtIndex?: number;
    error?: string;
}
/**
 *
 * Creates initial state, draws cards, sets deployment phase, then applies
 * each action in order. Returns the final state and whether replay succeeded.
 */
export declare function replayGame(config: GameConfig, actions: Action[], options?: {
    hashFn?: (state: unknown) => string;
}): ReplayResult;
//# sourceMappingURL=replay.d.ts.map