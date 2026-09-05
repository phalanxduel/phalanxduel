import { describe, expect, it } from 'vitest';
import type { PhalanxEvent, TransactionLogEntry } from '@phalanxduel/shared';
import {
  buildPanoramicFailureRecord,
  buildPanoramicTurnRecords,
} from '../src/observability/panoramic.js';

const matchId = '11111111-2222-4333-8444-555555555555';
const entry = {
  sequenceNumber: 7,
  action: { type: 'pass', playerIndex: 0, timestamp: '2026-09-05T00:00:00.000Z' },
  stateHashBefore: 'before',
  stateHashAfter: 'after',
  timestamp: '2026-09-05T00:00:00.000Z',
  details: { type: 'pass' },
  phaseTrace: [],
  msgId: null,
} as unknown as TransactionLogEntry;

describe('PVL Panoramic View records', () => {
  it('derives stable match and turn correlation fields', () => {
    const records = buildPanoramicTurnRecords(matchId, entry, [
      {
        id: 'event-1',
        type: 'functional_update',
        name: 'turn.started',
        timestamp: entry.timestamp,
        payload: {},
        status: 'ok',
      } as PhalanxEvent,
    ]);

    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      trace_id: '11111111222243338444555555555555',
      span_id: '0000000000000007',
      match_id: matchId,
      service_name: 'phx-server',
      service_namespace: 'phalanxduel',
      deployment_environment: 'local',
      lane: 'game-engine',
      kind: 'turn.started',
      status: 'up',
      confidence: 'high',
      source: 'engine/src/events.ts',
    });
  });

  it('marks rejected actions as observed failures without error text', () => {
    expect(buildPanoramicFailureRecord(matchId, 'attack')).toMatchObject({
      trace_id: '11111111222243338444555555555555',
      match_id: matchId,
      lane: 'state-machine',
      kind: 'action.rejected',
      label: 'attack rejected',
      status: 'down',
      confidence: 'observed-failure',
    });
  });
});
