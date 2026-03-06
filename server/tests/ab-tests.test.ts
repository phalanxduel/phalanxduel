import { afterEach, describe, expect, it } from 'vitest';
import { getAbTestsSnapshotFromEnv } from '../src/abTests';

const ORIGINAL = process.env['PHALANX_AB_TESTS_JSON'];

afterEach(() => {
  if (ORIGINAL === undefined) {
    delete process.env['PHALANX_AB_TESTS_JSON'];
    return;
  }
  process.env['PHALANX_AB_TESTS_JSON'] = ORIGINAL;
});

describe('getAbTestsSnapshotFromEnv', () => {
  it('returns empty config when env var is absent', () => {
    delete process.env['PHALANX_AB_TESTS_JSON'];
    const snapshot = getAbTestsSnapshotFromEnv();

    expect(snapshot.tests).toEqual([]);
    expect(snapshot.warnings).toEqual([]);
  });

  it('parses variant maps and computes totals', () => {
    process.env['PHALANX_AB_TESTS_JSON'] = JSON.stringify([
      {
        id: 'lobby_framework',
        description: 'Roll out preact lobby',
        variants: { control: 90, preact: 10 },
      },
    ]);

    const snapshot = getAbTestsSnapshotFromEnv();

    expect(snapshot.tests).toEqual([
      {
        id: 'lobby_framework',
        description: 'Roll out preact lobby',
        variants: [
          { name: 'control', ratio: 90 },
          { name: 'preact', ratio: 10 },
        ],
        totalRatio: 100,
      },
    ]);
    expect(snapshot.warnings).toEqual([]);
  });

  it('emits warnings for invalid JSON', () => {
    process.env['PHALANX_AB_TESTS_JSON'] = '{not-json';
    const snapshot = getAbTestsSnapshotFromEnv();

    expect(snapshot.tests).toEqual([]);
    expect(snapshot.warnings).toContain('PHALANX_AB_TESTS_JSON is not valid JSON');
  });

  it('emits warning when ratio total is not 100', () => {
    process.env['PHALANX_AB_TESTS_JSON'] = JSON.stringify([
      {
        id: 'new_matchmaking',
        variants: [
          { name: 'control', ratio: 50 },
          { name: 'variant', ratio: 40 },
        ],
      },
    ]);

    const snapshot = getAbTestsSnapshotFromEnv();

    expect(snapshot.tests[0]?.totalRatio).toBe(90);
    expect(snapshot.warnings).toContain(
      'Entry "new_matchmaking": ratio total is 90 (expected 100)',
    );
  });

  it('warns and ignores duplicate experiment ids', () => {
    process.env['PHALANX_AB_TESTS_JSON'] = JSON.stringify([
      {
        id: 'lobby_framework',
        variants: { control: 95, preact: 5 },
      },
      {
        id: 'lobby_framework',
        variants: { control: 90, preact: 10 },
      },
    ]);

    const snapshot = getAbTestsSnapshotFromEnv();

    expect(snapshot.tests).toHaveLength(1);
    expect(snapshot.tests[0]?.variants).toEqual([
      { name: 'control', ratio: 95 },
      { name: 'preact', ratio: 5 },
    ]);
    expect(snapshot.warnings).toContain('Entry "lobby_framework": duplicate id ignored');
  });

  it('rejects negative ratios as invalid variant config', () => {
    process.env['PHALANX_AB_TESTS_JSON'] = JSON.stringify([
      {
        id: 'bad_negative_ratio',
        variants: { control: 101, preact: -1 },
      },
    ]);

    const snapshot = getAbTestsSnapshotFromEnv();

    expect(snapshot.tests).toEqual([]);
    expect(snapshot.warnings).toContain(
      'Entry "bad_negative_ratio": variants must be a non-empty array or object of ratios',
    );
  });
});
