import { describe, it, expect } from 'vitest';
import { assignGamertagSuffix, validateGamertagFull } from '../src/gamertag';

describe('assignGamertagSuffix', () => {
  it('returns null suffix when no existing users have this normalized tag', () => {
    const result = assignGamertagSuffix(null);
    expect(result).toEqual({ newSuffix: null, updateExisting: null });
  });

  it('assigns suffix 2 and updates existing user to 1 when one unsuffixed user exists', () => {
    const result = assignGamertagSuffix({ maxSuffix: null, count: 1 });
    expect(result).toEqual({ newSuffix: 2, updateExisting: 1 });
  });

  it('assigns next suffix when suffixed users exist', () => {
    const result = assignGamertagSuffix({ maxSuffix: 3, count: 3 });
    expect(result).toEqual({ newSuffix: 4, updateExisting: null });
  });
});

describe('validateGamertagFull', () => {
  it('returns null for valid clean gamertags', () => {
    expect(validateGamertagFull('DragonSlayer')).toBeNull();
  });

  it('returns error for too short', () => {
    expect(validateGamertagFull('ab')).toBe('Gamertag must be 3-20 characters');
  });

  it('returns generic error for blocked content', () => {
    expect(validateGamertagFull('TrumpFan')).toBe('That gamertag is not available');
  });

  it('returns format error before content check', () => {
    expect(validateGamertagFull('a')).toBe('Gamertag must be 3-20 characters');
  });
});
