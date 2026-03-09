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

  describe('computePlayerElo without DB', () => {
    it('returns baseline when database is unavailable', async () => {
      const service = new LadderService();
      const result = await service.computePlayerElo('fake-user-id', 'pvp');
      expect(result).toEqual({ elo: 1000, matchCount: 0, winCount: 0 });
    });

    it('returns baseline for all categories when DB unavailable', async () => {
      const service = new LadderService();
      const categories: Array<'pvp' | 'sp-random' | 'sp-heuristic'> = [
        'pvp',
        'sp-random',
        'sp-heuristic',
      ];
      for (const cat of categories) {
        const result = await service.computePlayerElo('any-id', cat);
        expect(result.elo).toBe(1000);
        expect(result.matchCount).toBe(0);
      }
    });
  });

  describe('getLeaderboard without DB', () => {
    it('returns empty array when database is unavailable', async () => {
      const service = new LadderService();
      const result = await service.getLeaderboard('pvp');
      expect(result).toEqual([]);
    });
  });

  describe('onMatchComplete without DB', () => {
    it('does not throw when database is unavailable', async () => {
      const service = new LadderService();
      await expect(
        service.onMatchComplete({
          player1Id: 'user-1',
          player2Id: null,
          botStrategy: 'random',
        }),
      ).resolves.toBeUndefined();
    });
  });

  describe('writeSnapshot without DB', () => {
    it('does not throw when database is unavailable', async () => {
      const service = new LadderService();
      await expect(
        service.writeSnapshot({
          userId: 'user-1',
          category: 'pvp',
          elo: 1050,
          matchCount: 5,
          winCount: 3,
        }),
      ).resolves.toBeUndefined();
    });
  });
});
