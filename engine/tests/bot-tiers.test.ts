import { describe, it, expect } from 'vitest';
import { TIER_CONFIG } from '../src/bot-tiers.js';
import type { BotTier, HeuristicWeights } from '../src/bot-tiers.js';

const TIERS = Object.keys(TIER_CONFIG) as BotTier[];
const BIASED_TIERS: BotTier[] = ['veteran', 'destroyer', 'sentinel', 'blitz'];

describe('TIER_CONFIG', () => {
  it('has exactly 8 tiers', () => {
    expect(TIERS).toHaveLength(8);
  });

  it('all weight values are within [0.0, 2.0]', () => {
    for (const tier of TIERS) {
      const { weights } = TIER_CONFIG[tier];
      for (const [key, val] of Object.entries(weights) as [keyof HeuristicWeights, number][]) {
        expect(val, `${tier}.${key}`).toBeGreaterThanOrEqual(0.0);
        expect(val, `${tier}.${key}`).toBeLessThanOrEqual(2.0);
      }
    }
  });

  it('tiers 4-7 have distinct weight profiles from each other', () => {
    const profiles = BIASED_TIERS.map((t) => JSON.stringify(TIER_CONFIG[t].weights));
    const unique = new Set(profiles);
    expect(unique.size).toBe(BIASED_TIERS.length);
  });

  it('scout strategy is random with 0 iterations', () => {
    expect(TIER_CONFIG.scout.strategy).toBe('random');
    expect(TIER_CONFIG.scout.mctsIterations).toBe(0);
  });

  it('champion has the highest mctsIterations', () => {
    const maxIters = Math.max(...TIERS.map((t) => TIER_CONFIG[t].mctsIterations));
    expect(TIER_CONFIG.champion.mctsIterations).toBe(maxIters);
  });
});
