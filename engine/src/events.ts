/**
 * Copyright © 2026 Mike Hall
 * Licensed under the GNU General Public License v3.0.
 *
 * Pure function that projects a TransactionLogEntry into a PhalanxEvent[].
 * No I/O, no side effects — same input always produces identical output.
 */

import type { TransactionLogEntry, PhalanxEvent } from '@phalanxduel/shared';
import { TelemetryName } from '@phalanxduel/shared';

function assertNever(x: never): never {
  throw new Error(`Unhandled details type: ${JSON.stringify(x)}`);
}

/**
 * Derives a deterministic, schema-valid PhalanxEvent[] from a single
 * TransactionLogEntry.
 *
 * Event IDs follow the pattern: `${matchId}:seq${sequenceNumber}:ev${index}`
 * so that replaying the same match produces identical event IDs without
 * requiring any database state.
 */
export function deriveEventsFromEntry(entry: TransactionLogEntry, matchId: string): PhalanxEvent[] {
  const events: PhalanxEvent[] = [];
  let idx = 0;

  const makeId = (): string => `${matchId}:seq${entry.sequenceNumber}:ev${idx++}`;
  const turnSpanId = `${matchId}:seq${entry.sequenceNumber}:turn`;

  const trace = entry.phaseTrace ?? [];

  // --- Phase span_started events (one per phase hop) ---
  for (const hop of trace) {
    events.push({
      id: makeId(),
      parentId: turnSpanId,
      type: 'span_started',
      name: TelemetryName.EVENT_PHASE_START,
      timestamp: entry.timestamp,
      payload: { from: hop.from, trigger: hop.trigger, to: hop.to },
      status: 'ok',
    });
  }

  // --- Functional update(s) based on action / detail type ---

  // system:init reuses details.type === 'pass' — detect via action.type first
  if (entry.action.type === 'system:init') {
    events.push({
      id: makeId(),
      parentId: turnSpanId,
      type: 'functional_update',
      name: TelemetryName.EVENT_INIT,
      timestamp: entry.timestamp,
      payload: {},
      status: 'ok',
    });
  } else {
    const details = entry.details;

    switch (details.type) {
      case 'attack': {
        for (const step of details.combat.steps) {
          const payload: Record<string, unknown> = {
            target: step.target,
            damage: step.damage,
          };
          if (step.card !== undefined) payload.card = step.card;
          if (step.incomingDamage !== undefined) payload.incomingDamage = step.incomingDamage;
          if (step.effectiveHp !== undefined) payload.effectiveHp = step.effectiveHp;
          if (step.hpBefore !== undefined) payload.hpBefore = step.hpBefore;
          if (step.hpAfter !== undefined) payload.hpAfter = step.hpAfter;
          if (step.lpBefore !== undefined) payload.lpBefore = step.lpBefore;
          if (step.lpAfter !== undefined) payload.lpAfter = step.lpAfter;
          if (step.absorbed !== undefined) payload.absorbed = step.absorbed;
          if (step.overflow !== undefined) payload.overflow = step.overflow;
          if (step.destroyed !== undefined) payload.destroyed = step.destroyed;
          if (step.bonuses !== undefined) payload.bonuses = step.bonuses;

          events.push({
            id: makeId(),
            parentId: turnSpanId,
            type: 'functional_update',
            name: TelemetryName.EVENT_COMBAT_STEP,
            timestamp: entry.timestamp,
            payload,
            status: 'ok',
          });
        }
        break;
      }

      case 'deploy': {
        events.push({
          id: makeId(),
          parentId: turnSpanId,
          type: 'functional_update',
          name: TelemetryName.EVENT_DEPLOY,
          timestamp: entry.timestamp,
          payload: { gridIndex: details.gridIndex, phaseAfter: details.phaseAfter },
          status: 'ok',
        });
        break;
      }

      case 'reinforce': {
        events.push({
          id: makeId(),
          parentId: turnSpanId,
          type: 'functional_update',
          name: TelemetryName.EVENT_REINFORCE,
          timestamp: entry.timestamp,
          payload: {
            column: details.column,
            gridIndex: details.gridIndex,
            cardsDrawn: details.cardsDrawn,
          },
          status: 'ok',
        });
        break;
      }

      case 'pass': {
        events.push({
          id: makeId(),
          parentId: turnSpanId,
          type: 'functional_update',
          name: TelemetryName.EVENT_PASS,
          timestamp: entry.timestamp,
          payload: {},
          status: 'ok',
        });
        break;
      }

      case 'forfeit': {
        events.push({
          id: makeId(),
          parentId: turnSpanId,
          type: 'functional_update',
          name: TelemetryName.EVENT_FORFEIT,
          timestamp: entry.timestamp,
          payload: { winnerIndex: details.winnerIndex },
          status: 'ok',
        });
        break;
      }

      default:
        assertNever(details);
    }
  }

  // --- span_ended for the final phase hop ---
  if (trace.length > 0) {
    const lastHop = trace[trace.length - 1]!;
    events.push({
      id: makeId(),
      parentId: turnSpanId,
      type: 'span_ended',
      name: TelemetryName.EVENT_PHASE_END,
      timestamp: entry.timestamp,
      payload: { from: lastHop.from, trigger: lastHop.trigger, to: lastHop.to },
      status: 'ok',
    });
  }

  return events;
}
