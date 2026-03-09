import { describe, it, expect } from 'vitest';
import { LadderService } from '../src/ladder.js';

describe('LadderService', () => {
  describe('deriveCategory', () => {
    it('returns pvp when botStrategy is null', () => {
      expect(LadderService.deriveCategory(null)).toBe('pvp');
    });

    it('returns pvp when botStrategy is undefined', () => {
      expect(LadderService.deriveCategory(undefined)).toBe('pvp');
    });

    it('returns sp-random for random bot', () => {
      expect(LadderService.deriveCategory('random')).toBe('sp-random');
    });

    it('returns sp-heuristic for heuristic bot', () => {
      expect(LadderService.deriveCategory('heuristic')).toBe('sp-heuristic');
    });
  });

  describe('phantomRating', () => {
    it('returns 600 for sp-random', () => {
      expect(LadderService.phantomRating('sp-random')).toBe(600);
    });

    it('returns 1000 for sp-heuristic', () => {
      expect(LadderService.phantomRating('sp-heuristic')).toBe(1000);
    });

    it('returns null for pvp', () => {
      expect(LadderService.phantomRating('pvp')).toBeNull();
    });
  });
});
