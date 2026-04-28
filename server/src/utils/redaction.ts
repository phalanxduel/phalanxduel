/**
 * Copyright © 2026 Mike Hall
 * Licensed under the GNU Affero General Public License v3.0.
 */

import type { PhalanxEvent, MatchEventLog, TransactionLogEntry } from '@phalanxduel/shared';
import { computeStateHash } from '@phalanxduel/shared/hash';

/**
 * Redacts sensitive information from transaction log entries for public view.
 */
export function redactTransactionLog(
  log: TransactionLogEntry[] | undefined,
  viewerIndex: number | null,
): TransactionLogEntry[] | undefined {
  if (!log) return log;

  return log.map((entry) => {
    // Redact cardId from deploy/reinforce actions if the viewer is not the acting player.
    // Participants see their own hand history; spectators and opponents see 'redacted'.
    const action = entry.action;
    const actionPlayerIndex = 'playerIndex' in action ? action.playerIndex : null;
    const isOwner = viewerIndex !== null && actionPlayerIndex === viewerIndex;

    if (!isOwner && (action.type === 'deploy' || action.type === 'reinforce')) {
      return {
        ...entry,
        action: {
          ...action,
          cardId: 'redacted',
        },
      };
    }
    return entry;
  });
}

/**
 * Redacts card details in events for public/spectator view.
 */
export function redactPhalanxEvents(events: PhalanxEvent[]): PhalanxEvent[] {
  // Currently, events are considered public once they occur on the battlefield.
  return events;
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
