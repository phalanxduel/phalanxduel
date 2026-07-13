/**
 * Copyright © 2026 Mike Hall
 * Licensed under the GNU Affero General Public License v3.0.
 *
 * Deterministic attack preview: applies the authoritative turn on a cloned state
 * so the UI can show the expected outcome before the action is submitted.
 * All transition and combat semantics are delegated to applyAction — no rule logic
 * lives here.
 */

import type { Action, GameState } from '@phalanxduel/shared';
import type { CombatResolutionContext } from '@phalanxduel/shared';
import { TelemetryName } from '@phalanxduel/shared';
import { deriveEventsFromEntry } from './events.js';
import { applyAction } from './turns.js';

export type AttackPreviewVerdict =
  | 'WINNING_EXCHANGE'
  | 'EVEN_EXCHANGE'
  | 'LOSING_EXCHANGE'
  | 'DIRECT_DAMAGE_RISK';

export interface AttackPreview {
  verdict: AttackPreviewVerdict;
  /** Simulated resolution context — derived from the cloned post-combat state. */
  resolution: CombatResolutionContext;
}

/**
 * Simulates an attack action against a deep clone of the current state.
 * Returns a typed preview verdict and a full CombatResolutionContext.
 *
 * The resolution context is byte-identical to the one that will be emitted
 * as the `attack.resolved` event if this same action is applied for real.
 */
export function simulateAttack(
  state: GameState,
  action: Extract<Action, { type: 'attack' }>,
): AttackPreview {
  // Deep clone via JSON round-trip — state is already JSON-serializable.
  const cloned = JSON.parse(JSON.stringify(state)) as GameState;

  const committed = applyAction(cloned, action, { timestamp: action.timestamp });
  const entry = committed.transactionLog?.at(-1);
  if (!entry) {
    throw new Error('Authoritative attack preview produced no transaction entry');
  }

  const resolvedEvent = deriveEventsFromEntry(entry, 'preview').find(
    (event) => event.name === TelemetryName.EVENT_ATTACK_RESOLVED,
  );
  if (!resolvedEvent) {
    throw new Error('Authoritative attack preview produced no attack.resolved event');
  }

  const resolution = resolvedEvent.payload as unknown as CombatResolutionContext;

  const verdict = resolveVerdict(resolution);

  return { verdict, resolution };
}

function resolveVerdict(resolution: CombatResolutionContext): AttackPreviewVerdict {
  if (resolution.outcome.playerDamaged || resolution.outcome.victoryTriggered) {
    return 'DIRECT_DAMAGE_RISK';
  }
  if (resolution.outcome.defenderFrontDestroyed && resolution.outcome.defenderBackDestroyed) {
    return 'WINNING_EXCHANGE';
  }
  if (resolution.outcome.defenderFrontDestroyed) {
    return 'EVEN_EXCHANGE';
  }
  return 'LOSING_EXCHANGE';
}
