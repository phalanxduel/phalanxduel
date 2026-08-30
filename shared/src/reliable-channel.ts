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

function createReliableMessageUuid(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }

  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function buildReliableMessage<T extends Record<string, unknown>>(
  payload: T,
  msgId?: string,
): T & { msgId: string } {
  const id =
    msgId ??
    ('msgId' in payload && typeof payload.msgId === 'string'
      ? payload.msgId
      : createReliableMessageUuid());
  return { ...payload, msgId: id };
}
