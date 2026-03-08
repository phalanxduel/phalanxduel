import { describe, it, expect } from 'vitest';
import { formatGamertag, normalizeGamertag, validateGamertag } from '../src/gamertag';

describe('formatGamertag', () => {
  it('returns gamertag without suffix when suffix is null', () => {
    expect(formatGamertag('Dragon', null)).toBe('Dragon');
  });

  it('returns gamertag with suffix when suffix is provided', () => {
    expect(formatGamertag('Dragon', 3)).toBe('Dragon#3');
  });

  it('returns gamertag with suffix 1', () => {
    expect(formatGamertag('Dragon Slayer', 1)).toBe('Dragon Slayer#1');
  });
});

describe('normalizeGamertag', () => {
  it('lowercases and strips spaces, hyphens, underscores', () => {
    expect(normalizeGamertag('Dragon_Slayer')).toBe('dragonslayer');
    expect(normalizeGamertag('dragon slayer')).toBe('dragonslayer');
    expect(normalizeGamertag('Dragon-Slayer')).toBe('dragonslayer');
    expect(normalizeGamertag('DragonSlayer')).toBe('dragonslayer');
  });
});

describe('validateGamertag', () => {
  it('accepts valid gamertags', () => {
    expect(validateGamertag('Dragon')).toEqual({ ok: true });
    expect(validateGamertag('Cool Name 123')).toEqual({ ok: true });
    expect(validateGamertag('a-b_c')).toEqual({ ok: true });
    expect(validateGamertag('abc')).toEqual({ ok: true });
  });

  it('rejects too short', () => {
    expect(validateGamertag('ab')).toEqual({
      ok: false,
      reason: 'Gamertag must be 3-20 characters',
    });
  });

  it('rejects too long', () => {
    expect(validateGamertag('a'.repeat(21))).toEqual({
      ok: false,
      reason: 'Gamertag must be 3-20 characters',
    });
  });

  it('rejects non-ASCII characters', () => {
    expect(validateGamertag('Dräg0n')).toEqual({
      ok: false,
      reason: 'Only letters, numbers, spaces, hyphens, and underscores allowed',
    });
  });

  it('rejects no letters', () => {
    expect(validateGamertag('123')).toEqual({
      ok: false,
      reason: 'Must contain at least one letter',
    });
  });

  it('rejects leading/trailing whitespace', () => {
    expect(validateGamertag(' Dragon')).toEqual({
      ok: false,
      reason: 'No leading or trailing whitespace',
    });
    expect(validateGamertag('Dragon ')).toEqual({
      ok: false,
      reason: 'No leading or trailing whitespace',
    });
  });

  it('rejects consecutive spaces', () => {
    expect(validateGamertag('Dragon  Slayer')).toEqual({
      ok: false,
      reason: 'No consecutive spaces',
    });
  });
});
