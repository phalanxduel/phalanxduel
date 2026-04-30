/**
 * Copyright © 2026 Mike Hall
 * Licensed under the GNU Affero General Public License v3.0.
 *
 * Deterministic attack preview: simulates resolveAttack on a cloned state
 * so the UI can show the expected outcome before the action is submitted.
 * All combat math is delegated to resolveAttack — no rule logic lives here.
 */

import type { Action, GameState } from '@phalanxduel/shared';
import { deriveCombatResolution } from '@phalanxduel/shared';
import type { CombatResolutionContext } from '@phalanxduel/shared';
import { resolveAttack } from './combat.js';
import { isColumnFull } from './state.js';
import { checkVictory } from './turns.js';

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

  const { combatEntry, state: postState } = resolveAttack(
    cloned,
    action.playerIndex,
    action.attackingColumn,
    action.defendingColumn,
  );

  const defenderIndex = action.playerIndex === 0 ? 1 : 0;
  const targetCol = action.attackingColumn;
  const { rows, columns } = state.params;

  const defender = postState.players[defenderIndex];
  const defenderBf = defender?.battlefield ?? [];

  // Use checkVictory (same logic as turns.ts) to match victoryTriggered exactly.
  const victoryTriggered = checkVictory(postState) !== null;
  const frontAfterNull = (defenderBf[targetCol] ?? null) === null;
  const reinforcementTriggered =
    frontAfterNull &&
    (defender?.hand.length ?? 0) > 0 &&
    !isColumnFull(defenderBf, targetCol, rows, columns);

  // mode is intentionally omitted — events.ts also omits it, keeping outputs byte-identical.
  const resolution = deriveCombatResolution(combatEntry, {
    reinforcementTriggered,
    victoryTriggered,
  });

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
