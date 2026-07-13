/**
 * Copyright © 2026 Mike Hall
 * Licensed under the GNU Affero General Public License v3.0.
 *
 * Competitive v3.0 liveness policy.
 *
 * The evaluator runs only at canonical AttackPhase turn boundaries. Historical
 * v1.0 and v2.0 states bypass this module so their replay transition relations
 * are unchanged.
 */

import type { Action, DrawTerminationType, GameState, LivenessState } from '@phalanxduel/shared';

export const LIVENESS_POLICY = Object.freeze({
  repetitionOccurrences: 3,
  noProgressTurns: 50,
  hardTurnLimit: 200,
});

export interface LivenessEvaluation {
  liveness: LivenessState;
  drawReason: DrawTerminationType | null;
  completedTurnNumber: number | null;
}

function cardToken(card: { suit: string; face: string }): string {
  return `${card.suit[0] ?? ''}${card.face}`;
}

/**
 * Collision-free canonical witness for the supported 52-card domain.
 *
 * Suit initial + face uniquely identifies a card within each player's
 * canonical deck. Array positions preserve all order-sensitive zones. Match
 * constants and audit metadata are excluded because they cannot change legal
 * continuations within a match.
 */
export function semanticPositionSignature(state: GameState): string {
  return JSON.stringify([
    state.specVersion,
    state.phase,
    state.activePlayerIndex,
    state.passState ? [state.passState.consecutivePasses, state.passState.totalPasses] : null,
    state.players.map((player) => [
      player.deckSeed,
      player.lifepoints,
      player.hand.map(cardToken),
      player.battlefield.map((slot) =>
        slot ? [cardToken(slot.card), slot.currentHp, slot.faceDown ? 1 : 0] : null,
      ),
      player.drawpile.map(cardToken),
      player.discardPile.map(cardToken),
    ]),
  ]);
}

export function progressMarker(state: GameState): LivenessState['progressMarker'] {
  return {
    totalLifepoints: state.players.reduce((sum, player) => sum + player.lifepoints, 0),
    totalBattlefieldHp: state.players.reduce(
      (sum, player) =>
        sum + player.battlefield.reduce((playerSum, slot) => playerSum + (slot?.currentHp ?? 0), 0),
      0,
    ),
    totalDrawpileCards: state.players.reduce((sum, player) => sum + player.drawpile.length, 0),
    totalDiscardedCards: state.players.reduce((sum, player) => sum + player.discardPile.length, 0),
  };
}

export function hasIrreversibleProgress(
  before: LivenessState['progressMarker'],
  after: LivenessState['progressMarker'],
): boolean {
  return (
    after.totalLifepoints < before.totalLifepoints ||
    after.totalBattlefieldHp < before.totalBattlefieldHp ||
    after.totalDrawpileCards < before.totalDrawpileCards ||
    after.totalDiscardedCards > before.totalDiscardedCards
  );
}

function completedTurnNumber(before: GameState, after: GameState, action: Action): number | null {
  if (after.turnNumber <= before.turnNumber) return null;
  if (action.type !== 'attack' && action.type !== 'pass' && action.type !== 'reinforce') {
    return null;
  }
  return before.turnNumber;
}

/**
 * Advance liveness counters at a canonical turn boundary.
 *
 * Draw precedence is exact repetition, then no-progress, then the hard turn
 * cap. Decisive outcomes are evaluated by the caller before this function.
 */
export function evaluateLiveness(
  before: GameState,
  after: GameState,
  action: Action,
): LivenessEvaluation | null {
  if (after.specVersion !== '3.0' || after.phase !== 'AttackPhase') return null;

  const prior = before.liveness;
  const marker = progressMarker(after);
  const completed = completedTurnNumber(before, after, action);
  const noProgressTurns =
    completed === null || prior === undefined
      ? (prior?.noProgressTurns ?? 0)
      : hasIrreversibleProgress(prior.progressMarker, marker)
        ? 0
        : prior.noProgressTurns + 1;

  const signature = semanticPositionSignature(after);
  let occurrenceCount = 1;
  let found = false;
  const positionOccurrences = (prior?.positionOccurrences ?? []).map((occurrence) => {
    if (occurrence.signature !== signature) return occurrence;
    found = true;
    occurrenceCount = occurrence.count + 1;
    return { ...occurrence, count: occurrenceCount };
  });
  if (!found) positionOccurrences.push({ signature, count: occurrenceCount });

  let drawReason: DrawTerminationType | null = null;
  const completedForLimit = completed ?? 0;
  if (occurrenceCount >= LIVENESS_POLICY.repetitionOccurrences) {
    drawReason = 'repetitionDraw';
  } else if (completed !== null && noProgressTurns >= LIVENESS_POLICY.noProgressTurns) {
    drawReason = 'noProgressDraw';
  } else if (completedForLimit >= LIVENESS_POLICY.hardTurnLimit) {
    drawReason = 'turnLimitDraw';
  }

  return {
    liveness: { positionOccurrences, noProgressTurns, progressMarker: marker },
    drawReason,
    completedTurnNumber: completed,
  };
}
