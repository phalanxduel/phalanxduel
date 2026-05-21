import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LADDER_SIMULATION_CONFIG,
  compareLadderPolicies,
  createSeededRng,
  simulateLadderSeason,
} from '../src/ladder-simulation.js';

describe('ladder season simulation', () => {
  it('is deterministic for a fixed seed', () => {
    const first = simulateLadderSeason(DEFAULT_LADDER_SIMULATION_CONFIG);
    const second = simulateLadderSeason(DEFAULT_LADDER_SIMULATION_CONFIG);

    expect(second).toEqual(first);
  });

  it('protects the default golden season metrics', () => {
    const report = simulateLadderSeason(DEFAULT_LADDER_SIMULATION_CONFIG);

    expect(report.config).toEqual({
      seed: 20260521,
      players: 24,
      matches: 240,
      topN: 3,
      kFactor: 32,
    });
    expect(report.metrics).toEqual({
      ratingSkillSpearman: 0.8783,
      topNOverlap: 0.6667,
      averageGames: 20,
      minGames: 8,
      maxGames: 26,
      averageRecentVolatility: 14.85,
      largestRatingGain: 136,
      largestRatingLoss: -160,
    });
    expect(report.standings[0]).toEqual({
      rank: 1,
      skillRank: 1,
      id: 'ladder-player-019',
      name: 'Ladder Player 19',
      latentSkill: 1227,
      rating: 1136,
      games: 21,
      wins: 17,
      losses: 4,
      draws: 0,
    });
    expect(report.matches).toHaveLength(240);
  });

  it('creates reproducible seeded random streams', () => {
    const first = createSeededRng(42);
    const second = createSeededRng(42);

    expect([first(), first(), first()]).toEqual([second(), second(), second()]);
  });

  it('compares policy variants over the same seeded season', () => {
    const policies = compareLadderPolicies(DEFAULT_LADDER_SIMULATION_CONFIG, [16, 32, 48]);

    expect(policies).toEqual([
      expect.objectContaining({
        label: 'k=16',
        kFactor: 16,
        metrics: expect.objectContaining({ ratingSkillSpearman: 0.8435 }),
        topNPlayerIds: ['ladder-player-019', 'ladder-player-006', 'ladder-player-004'],
      }),
      expect.objectContaining({
        label: 'k=32',
        kFactor: 32,
        metrics: expect.objectContaining({ ratingSkillSpearman: 0.8783 }),
        topNPlayerIds: ['ladder-player-019', 'ladder-player-004', 'ladder-player-006'],
      }),
      expect.objectContaining({
        label: 'k=48',
        kFactor: 48,
        metrics: expect.objectContaining({ ratingSkillSpearman: 0.88 }),
        topNPlayerIds: ['ladder-player-019', 'ladder-player-004', 'ladder-player-006'],
      }),
    ]);
  });
});
