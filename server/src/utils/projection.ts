/**
 * Copyright © 2026 Mike Hall
 * Licensed under the GNU Affero General Public License v3.0.
 */

import type {
  GameState,
  PlayerState,
  Battlefield,
  Action,
  PhalanxEvent,
  GameViewModel,
  TurnViewModel,
} from '@phalanxduel/shared';
import { getValidActions } from '@phalanxduel/engine';
import { redactTransactionLog } from './redaction.js';

/**
 * Redacts battlefield card details when face-down.
 */
function redactBattlefield(battlefield: Battlefield): Battlefield {
  return battlefield.map((cell) => {
    if (!cell?.faceDown) return cell;
    return {
      ...cell,
      card: {
        id: cell.card.id, // ID is preserved for referencing
        suit: 'spades',
        face: '?',
        value: 0,
        type: 'number',
      },
    };
  });
}

/**
 * Redacts a player's private information (hand, drawpile).
 */
function redactHiddenCards(playerState: PlayerState): PlayerState {
  const { hand, drawpile, battlefield, discardPile, ...rest } = playerState;
  return {
    ...rest,
    battlefield: redactBattlefield(battlefield),
    hand: [],
    drawpile: [],
    // Show only the top card of the discard pile
    discardPile: discardPile.slice(-1),
    handCount: hand.length,
    drawpileCount: drawpile.length,
    discardPileCount: discardPile.length,
  };
}

/**
 * Projects a GameState into a tailored GameViewModel for a specific viewer.
 */
export function projectGameState(state: GameState, viewerIndex: number | null): GameViewModel {
  const p0 = state.players[0]!;
  const p1 = state.players[1]!;

  const projectedP0 =
    viewerIndex === 0 ? { ...p0, discardPileCount: p0.discardPile.length } : redactHiddenCards(p0);

  const projectedP1 =
    viewerIndex === 1 ? { ...p1, discardPileCount: p1.discardPile.length } : redactHiddenCards(p1);

  const redactedState: GameState = {
    ...state,
    players: [projectedP0, projectedP1],
    transactionLog: redactTransactionLog(state.transactionLog, viewerIndex),
  };

  return {
    state: redactedState,
    viewerIndex,
    validActions: viewerIndex !== null ? getValidActions(state, viewerIndex) : [],
  };
}

export interface TurnProjectionOptions {
  matchId: string;
  preState: GameState;
  postState: GameState;
  action: Action;
  events: PhalanxEvent[];
  viewerIndex: number | null;
}

/**
 * Projects a raw TurnResult into a redacted TurnViewModel.
 */
export function projectTurnResult(options: TurnProjectionOptions): TurnViewModel {
  const { matchId, preState, postState, action, events, viewerIndex } = options;
  const projectedPre = projectGameState(preState, viewerIndex);
  const projectedPost = projectGameState(postState, viewerIndex);

  return {
    matchId,
    viewerIndex,
    preState: projectedPre.state,
    postState: projectedPost.state,
    action,
    events,
    validActions: projectedPost.validActions,
  };
}
