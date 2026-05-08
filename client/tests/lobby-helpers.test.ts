import { describe, it, expect } from 'vitest';
import { validatePlayerName } from '../src/lobby';

describe('validatePlayerName', () => {
  it('returns null for valid names', () => {
    expect(validatePlayerName('Alice')).toBeNull();
    expect(validatePlayerName('Bob')).toBeNull();
    expect(validatePlayerName('Player123')).toBeNull();
  });

  it('rejects empty string', () => {
    expect(validatePlayerName('')).toMatch(/required/);
  });

  it('rejects names < 3 characters', () => {
    expect(validatePlayerName('A')).toMatch(/too short/);
    expect(validatePlayerName('Bo')).toMatch(/too short/);
  });

  it('rejects names over 30 characters', () => {
    expect(validatePlayerName('A'.repeat(31))).toMatch(/too long/);
  });

  it('allows exactly 30 characters', () => {
    expect(validatePlayerName('A'.repeat(30))).toBeNull();
  });

  it('rejects names with only symbols', () => {
    expect(validatePlayerName('!!!')).toMatch(/INVALID_CHARACTERS/);
    expect(validatePlayerName('___')).toMatch(/ALPHANUMERIC_REQUIRED/);
  });

  it('allows names with mixed symbols and letters', () => {
    expect(validatePlayerName('x-wing')).toBeNull();
    expect(validatePlayerName('Cool Name')).toBeNull();
  });
});
