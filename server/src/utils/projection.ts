/**
 * Copyright © 2026 Mike Hall
 * Licensed under the GNU Affero General Public License v3.0.
 */

import type {
  GameState,
  Action,
  PhalanxEvent,
  GameViewModel,
  TurnViewModel,
} from '@phalanxduel/shared';
import {
  getValidActions,
  observerForViewer,
  projectActionForObserver,
  projectEventsForObserver,
  projectGameStateForObserver,
} from '@phalanxduel/engine';

/**
 * Projects a GameState into a tailored GameViewModel for a specific viewer.
 */
export function projectGameState(state: GameState, viewerIndex: number | null): GameViewModel {
  const observer = observerForViewer(viewerIndex);

  return {
    state: projectGameStateForObserver(state, observer),
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
  const observer = observerForViewer(viewerIndex);
  const projectedPre = projectGameState(preState, viewerIndex);
  const projectedPost = projectGameState(postState, viewerIndex);

  return {
    matchId,
    viewerIndex,
    preState: projectedPre.state,
    postState: projectedPost.state,
    action: projectActionForObserver(action, observer),
    events: projectEventsForObserver(events, observer),
    validActions: projectedPost.validActions,
  };
}
