/**
 * Copyright © 2026 Mike Hall
 * Licensed under the GNU General Public License v3.0.
 */

import type { GameState, Action } from '@phalanxduel/shared';
import { createInitialState, drawCards } from './state.js';
import type { GameConfig } from './state.js';
import { applyAction } from './turns.js';
import type { ApplyActionOptions } from './turns.js';

export interface ReplayResult {
  finalState: GameState;
  valid: boolean;
  failedAtIndex?: number;
  error?: string;
}

/**
 * PHX-TXLOG-003: Replay a game from its initial config and ordered actions.
 *
 * Creates initial state, draws cards, sets deployment phase, then applies
 * each action in order. Returns the final state and whether replay succeeded.
 */
export function replayGame(
  config: GameConfig,
  actions: Action[],
  options?: { hashFn?: (state: unknown) => string },
): ReplayResult {
  let state = createInitialState(config);
  state = drawCards(state, 0, 12);
  state = drawCards(state, 1, 12);
  state = { ...state, phase: 'deployment' };

  const applyOptions: ApplyActionOptions | undefined = options?.hashFn
    ? { hashFn: options.hashFn }
    : undefined;

  for (let i = 0; i < actions.length; i++) {
    try {
      state = applyAction(state, actions[i]!, applyOptions);
    } catch (err) {
      return {
        finalState: state,
        valid: false,
        failedAtIndex: i,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  return { finalState: state, valid: true };
}
