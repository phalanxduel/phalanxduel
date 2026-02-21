import type { GameState, Battlefield, GameOptions } from '@phalanxduel/shared';
export interface GameConfig {
    players: [{
        id: string;
        name: string;
    }, {
        id: string;
        name: string;
    }];
    rngSeed: number;
    gameOptions?: GameOptions;
}
/**
 * Create the initial game state for two players.
 * Each player gets a shuffled deck as their drawpile.
 * Uses different derived seeds for each player to avoid identical decks.
 */
export declare function createInitialState(config: GameConfig): GameState;
/**
 * Draw `count` cards from a player's drawpile into their hand.
 * Returns a new GameState with updated hand and drawpile.
 */
export declare function drawCards(state: GameState, playerIndex: number, count: number): GameState;
/**
 * PHX-DEPLOY-001: Deploy a card from a player's hand to a battlefield position.
 * The position index maps to the 8-slot grid: 0-3 = front row (L-R), 4-7 = back row (L-R).
 */
export declare function deployCard(state: GameState, playerIndex: number, handCardIndex: number, gridIndex: number): GameState;
/**
 * Get the grid index where a deploy card should be placed in a column.
 * Front row first (index = column), then back row (index = column + 4).
 * Returns null if column is full.
 */
export declare function getDeployTarget(battlefield: Battlefield, column: number): number | null;
/**
 * PHX-REINFORCE-001: Move back row card to front row if front is empty.
 * Returns a new battlefield array (pure function).
 */
export declare function advanceBackRow(battlefield: Battlefield, column: number): Battlefield;
/**
 * Check if both front and back row in a column are occupied.
 */
export declare function isColumnFull(battlefield: Battlefield, column: number): boolean;
/**
 * Get the grid index where a reinforcement card should be placed.
 * Prioritizes back row, then front row. Returns null if column is full.
 */
export declare function getReinforcementTarget(battlefield: Battlefield, column: number): number | null;
//# sourceMappingURL=state.d.ts.map