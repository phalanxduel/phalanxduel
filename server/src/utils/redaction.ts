/**
 * Copyright © 2026 Mike Hall
 * Licensed under the GNU Affero General Public License v3.0.
 */

import type { PhalanxEvent, MatchEventLog, TransactionLogEntry } from '@phalanxduel/shared';
import * as Hash from '@phalanxduel/shared/hash';
import {
  observerForViewer,
  projectEventsForObserver,
  projectTransactionLogForObserver,
} from '@phalanxduel/engine';
const { computeStateHash } = Hash;

/**
 * Redacts sensitive information from transaction log entries for public view.
 */
export function redactTransactionLog(
  log: TransactionLogEntry[] | undefined,
  viewerIndex: number | null,
): TransactionLogEntry[] | undefined {
  return projectTransactionLogForObserver(log, observerForViewer(viewerIndex));
}

/**
 * Redacts card details in events for public/spectator view.
 */
export function redactPhalanxEvents(events: PhalanxEvent[]): PhalanxEvent[] {
  return projectEventsForObserver(events, observerForViewer(null));
}

/**
 * Redacts a full event log for public/spectator consumption.
 */
export function filterEventLogForPublic(log: MatchEventLog): MatchEventLog {
  const events = redactPhalanxEvents(log.events);
  const fingerprint = computeStateHash(events);
  return {
    ...log,
    events,
    fingerprint,
  };
}
