import { describe, it, expect } from 'vitest';
import { validatePlayerName } from '../src/lobby';

describe('validatePlayerName', () => {
  it('returns null for valid names', () => {
    expect(validatePlayerName('Alice')).toBeNull();
    expect(validatePlayerName('Bo')).toBeNull();
    expect(validatePlayerName('Player123')).toBeNull();
  });

  it('rejects empty string', () => {
    expect(validatePlayerName('')).toMatch(/at least 2/);
  });

  it('rejects single character', () => {
    expect(validatePlayerName('A')).toMatch(/at least 2/);
  });

  it('rejects names over 20 characters', () => {
    expect(validatePlayerName('A'.repeat(21))).toMatch(/too long/);
  });

  it('allows exactly 20 characters', () => {
    expect(validatePlayerName('A'.repeat(20))).toBeNull();
  });

  it('rejects forbidden words', () => {
    // The patterns use \b word boundary, so test with the word standalone
    expect(validatePlayerName('cunt')).toMatch(/not allowed/);
  });

  it('rejects names with only symbols', () => {
    expect(validatePlayerName('!!!')).toMatch(/letters or numbers/);
    expect(validatePlayerName('---')).toMatch(/letters or numbers/);
  });

  it('allows names with mixed symbols and letters', () => {
    expect(validatePlayerName('x-wing')).toBeNull();
    expect(validatePlayerName('!cool!')).toBeNull();
  });
});
