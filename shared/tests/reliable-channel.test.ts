import { describe, it, expect } from 'vitest';
import { isRetry, isStale, buildReliableMessage } from '../src/reliable-channel.js';

describe('isRetry', () => {
  it('returns true when action msgId matches last entry msgId', () => {
    expect(isRetry({ msgId: 'abc' }, { msgId: 'abc' })).toBe(true);
  });

  it('returns false when msgIds differ', () => {
    expect(isRetry({ msgId: 'abc' }, { msgId: 'xyz' })).toBe(false);
  });

  it('returns false when action has no msgId', () => {
    expect(isRetry({}, { msgId: 'abc' })).toBe(false);
    expect(isRetry({ msgId: undefined }, { msgId: 'abc' })).toBe(false);
    expect(isRetry({ msgId: null }, { msgId: 'abc' })).toBe(false);
  });

  it('returns false when lastEntry is null', () => {
    expect(isRetry({ msgId: 'abc' }, null)).toBe(false);
  });

  it('returns false when lastEntry is undefined', () => {
    expect(isRetry({ msgId: 'abc' }, undefined)).toBe(false);
  });

  it('returns false when lastEntry has no msgId', () => {
    expect(isRetry({ msgId: 'abc' }, {})).toBe(false);
  });
});

describe('isStale', () => {
  it('returns false when expectedSequenceNumber is absent', () => {
    expect(isStale({}, 5)).toBe(false);
    expect(isStale({ expectedSequenceNumber: undefined }, 5)).toBe(false);
  });

  it('returns false on happy-path: expectedSequenceNumber === currentSeq + 1', () => {
    expect(isStale({ expectedSequenceNumber: 6 }, 5)).toBe(false);
    expect(isStale({ expectedSequenceNumber: 1 }, 0)).toBe(false);
  });

  it('returns true when expectedSequenceNumber is behind', () => {
    expect(isStale({ expectedSequenceNumber: 4 }, 5)).toBe(true);
  });

  it('returns true when expectedSequenceNumber is ahead', () => {
    expect(isStale({ expectedSequenceNumber: 8 }, 5)).toBe(true);
  });
});

describe('buildReliableMessage', () => {
  it('preserves existing msgId when present in payload', () => {
    const result = buildReliableMessage({ type: 'action', msgId: 'existing-id' });
    expect(result.msgId).toBe('existing-id');
  });

  it('uses explicit msgId argument when provided', () => {
    const result = buildReliableMessage({ type: 'action' }, 'override-id');
    expect(result.msgId).toBe('override-id');
  });

  it('explicit msgId argument takes precedence over payload msgId', () => {
    const result = buildReliableMessage({ type: 'action', msgId: 'payload-id' }, 'override-id');
    expect(result.msgId).toBe('override-id');
  });

  it('generates a UUID when no msgId is available', () => {
    const result = buildReliableMessage({ type: 'action' });
    expect(result.msgId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it('preserves all payload fields', () => {
    const result = buildReliableMessage({ type: 'action', data: 42 });
    expect(result.type).toBe('action');
    expect(result.data).toBe(42);
  });
});
