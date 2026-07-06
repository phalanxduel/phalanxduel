import { describe, it, expect } from 'vitest';
import { MAX_LADDER_OFFSET, isValidCategory } from '../src/routes/ladder.js';

describe('ladder routes', () => {
  describe('isValidCategory', () => {
    it('accepts pvp', () => {
      expect(isValidCategory('pvp')).toBe(true);
    });

    it('accepts sp-random', () => {
      expect(isValidCategory('sp-random')).toBe(true);
    });

    it('accepts sp-heuristic', () => {
      expect(isValidCategory('sp-heuristic')).toBe(true);
    });

    it('rejects invalid category', () => {
      expect(isValidCategory('invalid')).toBe(false);
    });
  });

  describe('MAX_LADDER_OFFSET', () => {
    it('stays within Go int32 client bounds', () => {
      expect(MAX_LADDER_OFFSET).toBe(2_147_483_647);
    });
  });
});
