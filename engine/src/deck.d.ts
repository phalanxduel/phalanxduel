import type { Card } from '@phalanx/shared';
/**
 * PHX-CARDS-001: Create a standard 52-card deck (no Jokers in base rules).
 */
export declare function createDeck(): Card[];
/**
 * Deterministic Fisher-Yates shuffle using a seeded PRNG.
 * Uses a simple mulberry32 algorithm for reproducibility.
 */
export declare function shuffleDeck(deck: Card[], seed: number): Card[];
//# sourceMappingURL=deck.d.ts.map