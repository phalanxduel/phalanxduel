/**
 * Copyright © 2026 Mike Hall
 * Licensed under the GNU Affero General Public License v3.0.
 *
 * Pure functions for the reliable client-server message protocol.
 *
 * Invariants:
 *   - msgId uniquely identifies a message; matching against the last log entry detects retries.
 *   - expectedSequenceNumber is a client freshness guard; mismatch means the action is stale.
 */

export interface ReliableEntry {
  msgId?: string | null;
}

export function isRetry(
  action: { msgId?: string | null },
  lastEntry: ReliableEntry | null | undefined,
): boolean {
  return !!action.msgId && lastEntry?.msgId === action.msgId;
}

export function isStale(action: { expectedSequenceNumber?: number }, currentSeq: number): boolean {
  return (
    action.expectedSequenceNumber !== undefined && action.expectedSequenceNumber !== currentSeq + 1
  );
}

export function buildReliableMessage<T extends Record<string, unknown>>(
  payload: T,
  msgId?: string,
): T & { msgId: string } {
  const id =
    msgId ??
    ('msgId' in payload && typeof payload.msgId === 'string' ? payload.msgId : crypto.randomUUID());
  return { ...payload, msgId: id };
}
