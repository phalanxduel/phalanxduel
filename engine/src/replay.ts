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

const DEFAULT_REPLAY_TIMESTAMP = '1970-01-01T00:00:00.000Z';

function getReplayTimestamp(config: GameConfig): string {
  return config.drawTimestamp ?? DEFAULT_REPLAY_TIMESTAMP;
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
  const replayTimestamp = getReplayTimestamp(config);
  let state = createInitialState({ ...config, drawTimestamp: replayTimestamp });

  // Transition from StartTurn to the first action phase via system:init
  state = applyAction(
    state,
    {
      type: 'system:init',
      timestamp: replayTimestamp,
    },
    { allowSystemInit: true },
  );

  const applyOptions: ApplyActionOptions | undefined = options?.hashFn
    ? { hashFn: options.hashFn }
    : undefined;

  for (let i = 0; i < actions.length; i++) {
    try {
      const action = actions[i];
      if (!action) throw new Error(`Missing action at index ${i}`);
      state = applyAction(state, action, applyOptions);
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
