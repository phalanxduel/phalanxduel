import { describe, expect, it } from 'vitest';
import { buildBotIdentity, deriveWaveSizes, parseWaveSizes } from '../../bin/qa/bot-swarm.js';

describe('bot swarm helpers', () => {
  it('formats filterable bot emails and gamertags', () => {
    const identity = buildBotIdentity(1, 'bot', 'phalanxduel.com');
    expect(identity.email).toBe('bot+00001@phalanxduel.com');
    expect(identity.gamertag).toBe('Bot00001');
    expect(identity.password).toContain('00001');
  });

  it('cycles personas in a stable order', () => {
    expect(buildBotIdentity(1, 'bot', 'phalanxduel.com').persona).toBe('born-to-lose');
    expect(buildBotIdentity(2, 'bot', 'phalanxduel.com').persona).toBe('stuck-in-middle');
    expect(buildBotIdentity(3, 'bot', 'phalanxduel.com').persona).toBe('born-to-be-wild');
  });

  it('parses explicit wave sizes', () => {
    expect(parseWaveSizes('1, 2, 3')).toEqual([1, 2, 3]);
    expect(parseWaveSizes('0, foo, -1')).toBeNull();
  });

  it('derives fibonacci wave sizes by default', () => {
    expect(
      deriveWaveSizes({
        growth: 'fibonacci',
        waveCount: 5,
        cohortSize: 2,
        explicitSizes: null,
        maxBots: 100,
      }),
    ).toEqual([1, 1, 2, 3, 5]);
  });

  it('repeats fixed wave size when requested', () => {
    expect(
      deriveWaveSizes({
        growth: 'fixed',
        waveCount: 4,
        cohortSize: 6,
        explicitSizes: null,
        maxBots: 100,
      }),
    ).toEqual([6, 6, 6, 6]);
  });
});
