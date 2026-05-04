/**
 * Copyright © 2026 Mike Hall
 * Licensed under the GNU Affero General Public License v3.0.
 */

import type { GameState, TurnViewModel } from '@phalanxduel/shared';
import { projectGameState, projectTurnResult, type TurnProjectionOptions } from './projection.js';
import type { MatchInstance } from '../match-types.js';

export function projectStateForViewer(state: GameState, viewerIndex: number | null): GameState {
  return projectGameState(state, viewerIndex).state;
}

export function projectTurnForViewer(
  options: Omit<TurnProjectionOptions, 'viewerIndex'>,
  viewerIndex: number | null,
): TurnViewModel {
  return projectTurnResult({ ...options, viewerIndex });
}

export function projectForViewer(match: MatchInstance, viewerIndex: number | null): TurnViewModel {
  const preState = match.lastPreState ?? match.state!;
  const postState = match.state!;
  const action = match.actionHistory.at(-1) ?? {
    type: 'system:init' as const,
    timestamp: new Date().toISOString(),
  };
  const events = match.lastEvents ?? [];
  return projectTurnResult({
    matchId: match.matchId,
    preState,
    postState,
    action,
    events,
    viewerIndex,
  });
}
