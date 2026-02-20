import type { GameState, Action, VictoryType } from '@phalanx/shared';
export interface ApplyActionOptions {
    hashFn?: (state: unknown) => string;
    timestamp?: string;
}
/**
 * PHX-VICTORY-001 + PHX-REINFORCE-005 + PHX-LP-002: Check if a player has won.
 * A player wins when the opponent has no cards anywhere OR opponent LP reaches 0.
 * Returns the winning player index and victory type, or null if no winner yet.
 */
export declare function checkVictory(state: GameState): {
    winnerIndex: number;
    victoryType: VictoryType;
} | null;
/**
 * PHX-TURNS-001: Validate that an action is legal in the current state.
 */
export declare function validateAction(state: GameState, action: Action): {
    valid: boolean;
    error?: string;
};
/**
 * Apply an action to the game state. Returns the new state.
 * This is the main dispatcher for all game actions.
 *
 * When `options.hashFn` is provided, each transaction log entry includes
 * state hashes before and after the action (excluding transactionLog to
 * avoid circularity).
 */
export declare function applyAction(state: GameState, action: Action, options?: ApplyActionOptions): GameState;
//# sourceMappingURL=turns.d.ts.map