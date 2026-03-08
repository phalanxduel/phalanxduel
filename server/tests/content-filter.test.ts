import { describe, it, expect } from 'vitest';
import { isBlockedGamertag } from '../src/content-filter';

describe('isBlockedGamertag', () => {
  it('blocks profanity', () => {
    expect(isBlockedGamertag('shithead')).toBe(true);
    expect(isBlockedGamertag('asshole')).toBe(true);
  });

  it('blocks hate speech terms', () => {
    expect(isBlockedGamertag('nazi')).toBe(true);
  });

  it('blocks political terms', () => {
    expect(isBlockedGamertag('trump')).toBe(true);
    expect(isBlockedGamertag('biden')).toBe(true);
    expect(isBlockedGamertag('maga')).toBe(true);
  });

  it('allows clean names', () => {
    expect(isBlockedGamertag('dragonslayer')).toBe(false);
    expect(isBlockedGamertag('coolwarrior99')).toBe(false);
  });

  it('catches substrings in normalized form', () => {
    expect(isBlockedGamertag('xtrumpx')).toBe(true);
  });

  it('operates on normalized input (lowercase, stripped)', () => {
    expect(isBlockedGamertag('dragonslayer')).toBe(false);
  });
});
