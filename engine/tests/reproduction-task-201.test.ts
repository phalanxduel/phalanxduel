import { describe, it, expect } from 'vitest';
import { createInitialState } from '../src/state.js';
import { DEFAULT_MATCH_PARAMS } from '@phalanxduel/shared';
import type { MatchParameters } from '@phalanxduel/shared';

describe('Deck Exhaustion Reproduction (TASK-201)', () => {
  it('should reproduce crash on deck exhaustion during initialization', () => {
    // Standard deck is 52 cards.
    // initialDraw = rows * columns + columns
    // For rows=6, columns=8: initialDraw = 6*8 + 8 = 48 + 8 = 56 cards.
    // Since each player draws this many, 56 * 2 = 112 cards total needed.
    // This will definitely exhaust the 52-card deck.

    const config = {
      matchId: 'test-match-id',
      players: [
        { id: 'p1', name: 'Player 1' },
        { id: 'p2', name: 'Player 2' },
      ],
      rngSeed: 123,
      matchParams: {
        ...DEFAULT_MATCH_PARAMS,
        rows: 6,
        columns: 8,
        initialDraw: 100, // 100 > 52 cards in deck
      } as MatchParameters,
    };

    // The user reported it "throws an unhandled exception instead of stopping gracefully"
    // Now it should stop gracefully at phase 'gameOver' due to cardDepletion.
    const state = createInitialState(config);
    expect(state.phase).toBe('gameOver');
    expect(state.outcome?.victoryType).toBe('cardDepletion');
  });
});
