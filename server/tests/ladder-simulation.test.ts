import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LADDER_SIMULATION_CONFIG,
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
});
