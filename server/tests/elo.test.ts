import { describe, it, expect } from 'vitest';
import { computeExpected, computeNewRating, computeRollingElo } from '../src/elo.js';

describe('Elo calculations', () => {
  describe('computeExpected', () => {
    it('returns 0.5 for equal ratings', () => {
      expect(computeExpected(1000, 1000)).toBeCloseTo(0.5);
    });

    it('returns higher expectation for higher-rated player', () => {
      const expected = computeExpected(1200, 1000);
      expect(expected).toBeGreaterThan(0.5);
      expect(expected).toBeCloseTo(0.76, 1);
    });

    it('returns lower expectation for lower-rated player', () => {
      const expected = computeExpected(800, 1000);
      expect(expected).toBeLessThan(0.5);
    });
  });

  describe('computeNewRating', () => {
    it('increases rating on win against equal opponent', () => {
      const newRating = computeNewRating(1000, 1000, true);
      expect(newRating).toBe(1016);
    });

    it('decreases rating on loss against equal opponent', () => {
      const newRating = computeNewRating(1000, 1000, false);
      expect(newRating).toBe(984);
    });

    it('gains less for beating a weaker opponent', () => {
      const gainVsWeak = computeNewRating(1200, 800, true) - 1200;
      const gainVsEqual = computeNewRating(1200, 1200, true) - 1200;
      expect(gainVsWeak).toBeLessThan(gainVsEqual);
    });

    it('loses more for losing to a weaker opponent', () => {
      const lossToWeak = 1200 - computeNewRating(1200, 800, false);
      const lossToEqual = 1200 - computeNewRating(1200, 1200, false);
      expect(lossToWeak).toBeGreaterThan(lossToEqual);
    });
  });

  describe('computeRollingElo', () => {
    it('returns 1000 for empty match list', () => {
      expect(computeRollingElo([])).toBe(1000);
    });

    it('computes correctly for a single win', () => {
      const result = computeRollingElo([{ opponentElo: 1000, win: true }]);
      expect(result).toBe(1016);
    });

    it('computes sequentially across multiple matches', () => {
      const result = computeRollingElo([
        { opponentElo: 1000, win: true },
        { opponentElo: 1000, win: true },
        { opponentElo: 1000, win: false },
      ]);
      // Start 1000, win vs 1000 -> 1016, win vs 1000 -> ~1030, lose vs 1000 -> ~1015
      expect(result).toBeGreaterThan(1000);
      expect(result).toBeLessThan(1032);
    });

    it('applies phantom ratings for bot matches', () => {
      const result = computeRollingElo([{ opponentElo: 600, win: true }]);
      // Beating a 600-rated bot from 1000 gives small gain
      expect(result).toBeGreaterThan(1000);
      expect(result).toBeLessThan(1010);
    });
  });
});
