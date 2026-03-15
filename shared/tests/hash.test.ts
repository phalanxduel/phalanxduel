import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { computeTurnHash } from '../src/hash.ts';

describe('computeTurnHash', () => {
  it('returns a 64-char hex SHA-256 string', () => {
    const hash = computeTurnHash('abc123', ['ev0', 'ev1']);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic: same inputs produce same output', () => {
    const a = computeTurnHash('stateHash', ['id1', 'id2', 'id3']);
    const b = computeTurnHash('stateHash', ['id1', 'id2', 'id3']);
    expect(a).toBe(b);
  });

  it('differs when stateHashAfter changes', () => {
    const a = computeTurnHash('hash-A', ['ev0']);
    const b = computeTurnHash('hash-B', ['ev0']);
    expect(a).not.toBe(b);
  });

  it('differs when eventIds change', () => {
    const a = computeTurnHash('hash', ['ev0', 'ev1']);
    const b = computeTurnHash('hash', ['ev0']);
    expect(a).not.toBe(b);
  });

  it('differs when eventId order changes', () => {
    const a = computeTurnHash('hash', ['ev0', 'ev1']);
    const b = computeTurnHash('hash', ['ev1', 'ev0']);
    expect(a).not.toBe(b);
  });

  it('reproduces offline: SHA-256(stateHashAfter + ":" + eventIds.join(":"))', () => {
    const stateHashAfter = 'deadbeef';
    const eventIds = ['match:seq1:ev0', 'match:seq1:ev1'];
    const expected = createHash('sha256')
      .update(stateHashAfter + ':' + eventIds.join(':'))
      .digest('hex');
    expect(computeTurnHash(stateHashAfter, eventIds)).toBe(expected);
  });

  it('handles empty eventIds without crashing', () => {
    const hash = computeTurnHash('someStateHash', []);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});
