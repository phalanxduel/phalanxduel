import { appendFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { PhalanxEvent, TransactionLogEntry } from '@phalanxduel/shared';

export type PanoramicStatus = 'up' | 'down';
export type PanoramicConfidence = 'high' | 'observed-failure';

export interface PanoramicRecord {
  timestamp: string;
  trace_id: string;
  span_id: string;
  match_id: string;
  qa_run_id?: string;
  service_name: 'phx-server';
  service_namespace: 'phalanxduel';
  deployment_environment: 'local';
  lane: string;
  kind: string;
  label: string;
  status: PanoramicStatus;
  duration_ms: number;
  source: string;
  confidence: PanoramicConfidence;
  sequence_number?: number;
  action_type?: string;
  phase?: string;
  state_hash_before?: string;
  state_hash_after?: string;
}

let writeQueue = Promise.resolve();
let directoryReady: Promise<void> | undefined;

function enabledPath(): string | undefined {
  const appEnv =
    process.env.APP_ENV ?? (process.env.NODE_ENV === 'production' ? 'production' : 'local');
  if (appEnv !== 'local' && process.env.NODE_ENV !== 'development') return undefined;
  return process.env.ZDOTS_APP_LOG?.trim() || undefined;
}

function traceIdForMatch(matchId: string): string {
  return matchId.replace(/-/g, '').toLowerCase();
}

function spanIdForSequence(sequenceNumber: number): string {
  return sequenceNumber.toString(16).padStart(16, '0').slice(-16);
}

function safeLabel(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').slice(0, 120);
}

export function buildPanoramicTurnRecords(
  matchId: string,
  entry: TransactionLogEntry,
  events: PhalanxEvent[],
  qaRunId?: string,
): PanoramicRecord[] {
  const traceId = traceIdForMatch(matchId);
  const spanId = spanIdForSequence(entry.sequenceNumber);
  const base = {
    timestamp: entry.timestamp,
    trace_id: traceId,
    span_id: spanId,
    match_id: matchId,
    ...(qaRunId ? { qa_run_id: qaRunId } : {}),
    service_name: 'phx-server' as const,
    service_namespace: 'phalanxduel' as const,
    deployment_environment: 'local' as const,
    sequence_number: entry.sequenceNumber,
    action_type: entry.action.type,
    state_hash_before: entry.stateHashBefore,
    state_hash_after: entry.stateHashAfter,
    lane: 'game-engine',
    status: 'up' as const,
    duration_ms: 0,
    confidence: 'high' as const,
  };

  if (events.length === 0) {
    return [
      {
        ...base,
        kind: 'turn.committed',
        label: safeLabel(`${entry.action.type} committed`),
        source: 'server/src/match-actor.ts',
      },
    ];
  }

  return events.map((event) => ({
    ...base,
    kind: safeLabel(event.name),
    label: safeLabel(event.name),
    source: 'engine/src/events.ts',
  }));
}

export function buildPanoramicFailureRecord(
  matchId: string,
  actionType: string,
  timestamp = new Date().toISOString(),
  qaRunId?: string,
): PanoramicRecord {
  return {
    timestamp,
    trace_id: traceIdForMatch(matchId),
    span_id: spanIdForSequence(0),
    match_id: matchId,
    ...(qaRunId ? { qa_run_id: qaRunId } : {}),
    service_name: 'phx-server',
    service_namespace: 'phalanxduel',
    deployment_environment: 'local',
    lane: 'state-machine',
    kind: 'action.rejected',
    label: safeLabel(`${actionType} rejected`),
    status: 'down',
    duration_ms: 0,
    source: 'server/src/match-actor.ts',
    confidence: 'observed-failure',
  };
}

export function emitPanoramicRecords(records: PanoramicRecord[]): void {
  const path = enabledPath();
  if (!path || records.length === 0) return;

  writeQueue = writeQueue
    .then(async () => {
      directoryReady ??= mkdir(dirname(path), { recursive: true }).then(() => undefined);
      await directoryReady;
      await appendFile(
        path,
        `${records.map((record) => JSON.stringify(record)).join('\n')}\n`,
        'utf8',
      );
    })
    .catch((error: unknown) => {
      // Observability must never affect gameplay or action persistence.
      console.warn('[Pavel/PVL] failed to append local evidence:', error);
    });
}
