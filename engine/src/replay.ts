/**
 * Copyright © 2026 Mike Hall
 * Licensed under the GNU General Public License v3.0.
 */

import type { GameState, Action } from '@phalanxduel/shared';
import { createInitialState } from './state.js';
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

  // Transition from StartTurn to AttackPhase via system:init
  state = applyAction(state, {
    type: 'system:init',
    timestamp: new Date().toISOString(),
  });

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
