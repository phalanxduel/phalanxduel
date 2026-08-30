import { describe, expect, it } from 'vitest';
import { RunEvidenceSchema } from '../src/run-evidence';

const evidence = {
  kind: 'phalanx-duel.run-evidence',
  version: 1,
  runner: { tool: 'engine-scenario', release: { commit: 'abc123' } },
  scenario: { id: 'scenario-1', seed: 1, damageMode: 'classic', startingLifepoints: 20 },
  adapters: { client: 'engine', transport: 'in-memory' },
  correlation: { qaRunId: 'qa-1', matchId: 'match-1' },
  startedAt: '2026-08-30T00:00:00.000Z',
  endedAt: '2026-08-30T00:00:01.000Z',
  durationMs: 1000,
  actions: [{ index: 0, type: 'pass', playerIndex: 0, at: '2026-08-30T00:00:00.500Z' }],
  events: [{ index: 0, type: 'action', at: '2026-08-30T00:00:00.500Z', detail: 'pass' }],
  phases: ['StartTurn'],
  integrity: { actionCount: 1, eventCount: 1, replayArtifact: 'replay_frames.json' },
  outcome: { status: 'success', summary: 'completed' },
  assertions: [{ name: 'hash chain', status: 'pass' }],
  artifacts: [{ kind: 'replay', path: 'replay_frames.json', public: false }],
  viewerPolicy: {
    visibility: 'internal',
    hiddenStateExcluded: true,
    privatePlayerDataExcluded: true,
  },
} as const;

describe('RunEvidenceSchema', () => {
  it('accepts a complete redaction-safe evidence record', () => {
    expect(RunEvidenceSchema.parse(evidence)).toEqual(evidence);
  });

  it('rejects inconsistent counts, traversal, and skipped success proof', () => {
    expect(
      RunEvidenceSchema.safeParse({
        ...evidence,
        integrity: { ...evidence.integrity, actionCount: 2 },
      }).success,
    ).toBe(false);
    expect(
      RunEvidenceSchema.safeParse({
        ...evidence,
        artifacts: [{ kind: 'replay', path: '../secret', public: false }],
      }).success,
    ).toBe(false);
    expect(
      RunEvidenceSchema.safeParse({
        ...evidence,
        assertions: [{ name: 'proof', status: 'skipped' }],
      }).success,
    ).toBe(false);
  });
});
