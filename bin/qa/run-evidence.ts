import { RunEvidenceSchema, type CanonicalRunEvidence } from '../../shared/src/run-evidence.ts';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

type LegacyManifest = {
  tool?: string;
  runId?: string;
  qaRunId?: string;
  matchId?: string | null;
  seed?: number;
  startAt?: string;
  endAt?: string;
  durationMs?: number;
  actionCount?: number;
  baseUrl?: string;
  transport?: 'websocket' | 'rest';
  damageMode?: string;
  startingLifepoints?: number;
  status?: 'success' | 'failure' | 'skipped';
  failureReason?: string;
  failureMessage?: string;
  turnCount?: number;
  actionCount?: number;
  finalStateHash?: string | null;
  outcomeText?: string | null;
  phases?: string[];
  screenshots?: string[];
};

type LegacyEvent = { type?: string; at?: string; detail?: string };

const iso = (value: string | undefined, fallback: string): string => {
  const parsed = Date.parse(value ?? '');
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : fallback;
};

export function canonicalizeLegacyRun(
  manifest: LegacyManifest,
  events: LegacyEvent[] = [],
  replayArtifact = 'replay_frames.json',
): CanonicalRunEvidence {
  const startedAt = iso(manifest.startAt, new Date(0).toISOString());
  const endedAt = iso(manifest.endAt, startedAt);
  const status = manifest.status ?? 'failure';
  const canonical = {
    kind: 'phalanx-duel.run-evidence' as const,
    version: 1 as const,
    runner: { tool: manifest.tool ?? 'legacy-qa-runner', release: {} },
    scenario: {
      id: manifest.runId ?? manifest.qaRunId ?? 'legacy-run',
      seed: manifest.seed ?? 0,
      damageMode: manifest.damageMode,
      startingLifepoints: manifest.startingLifepoints,
    },
    adapters: {
      client: manifest.tool?.includes('swiftui')
        ? 'swiftui'
        : manifest.tool?.includes('api')
          ? 'api'
          : 'browser',
      transport: manifest.tool?.includes('swiftui')
        ? 'native-ui'
        : manifest.transport === 'rest'
          ? 'http'
          : 'websocket',
    },
    correlation: {
      qaRunId: manifest.qaRunId ?? manifest.runId,
      matchId: manifest.matchId ?? undefined,
    },
    startedAt,
    endedAt,
    durationMs: manifest.durationMs ?? 0,
    actions: events
      .filter((event) => event.type === 'action')
      .map((event, index) => ({
        index,
        type: event.detail?.split(' ')[0] ?? 'unknown',
        at: iso(event.at, startedAt),
      })),
    events: events.map((event, index) => ({
      index,
      type: event.type ?? 'unknown',
      at: iso(event.at, startedAt),
      detail: event.detail,
    })),
    phases: manifest.phases ?? [],
    integrity: {
      finalStateHash: manifest.finalStateHash ?? undefined,
      actionCount: events.filter((event) => event.type === 'action').length,
      eventCount: events.length,
      replayArtifact,
    },
    outcome: { status, summary: manifest.outcomeText ?? manifest.failureMessage ?? null },
    assertions: [
      {
        name: 'legacy manifest status',
        status: status === 'success' ? 'pass' : status === 'skipped' ? 'skipped' : 'fail',
        detail: manifest.failureReason,
      },
    ],
    artifacts: [
      ...(manifest.screenshots ?? []).map((path) => ({ kind: 'screenshot', path, public: false })),
      { kind: 'replay', path: replayArtifact, public: false },
    ],
    viewerPolicy: {
      visibility: 'internal' as const,
      hiddenStateExcluded: true as const,
      privatePlayerDataExcluded: true as const,
    },
  };
  return RunEvidenceSchema.parse(canonical);
}

export async function writeCanonicalRunEvidence(
  runDir: string,
  manifest: LegacyManifest,
  events: LegacyEvent[] = [],
  replayArtifact = 'replay_frames.json',
): Promise<CanonicalRunEvidence> {
  const evidence = canonicalizeLegacyRun(manifest, events, replayArtifact);
  await writeFile(join(runDir, 'run-evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`);
  return evidence;
}
