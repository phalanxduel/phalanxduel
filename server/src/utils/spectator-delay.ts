/**
 * Copyright © 2026 Mike Hall
 * Licensed under the GNU Affero General Public License v3.0.
 */

import type { Action, GameState, PhalanxEvent } from '@phalanxduel/shared';
import { computeStateHash } from '@phalanxduel/shared/hash';
import { deriveEventsFromEntry, replayGameAtOrBeforeTurn } from '@phalanxduel/engine';
import type { MatchInstance } from '../match-types.js';

export const MINIMUM_SPECTATOR_DELAY_TURNS = 2;
export const DEFAULT_SPECTATOR_DELAY_TURNS = 3;

export interface SpectatorFrame {
  preState: GameState;
  postState: GameState;
  action: Action;
  events: PhalanxEvent[];
  turnHash?: string;
}

/**
 * Reconstruct a live spectator frame from authoritative actions. Failure is
 * fail-closed: callers receive null and must not substitute the current state.
 */
export function buildDelayedSpectatorFrame(
  match: MatchInstance,
  delayTurns = DEFAULT_SPECTATOR_DELAY_TURNS,
): SpectatorFrame | null {
  if (delayTurns < MINIMUM_SPECTATOR_DELAY_TURNS) {
    throw new Error(`spectator delay must be at least ${MINIMUM_SPECTATOR_DELAY_TURNS} turns`);
  }
  if (!match.state || !match.config) return null;

  const replay = replayGameAtOrBeforeTurn(
    match.config,
    match.actionHistory,
    match.state.turnNumber - delayTurns,
    { hashFn: computeStateHash },
  );
  if (!replay.valid) return null;

  const entry = replay.finalState.transactionLog?.at(-1);
  if (!entry) return null;
  const events = deriveEventsFromEntry(entry, match.matchId);
  return {
    preState: replay.preState,
    postState: replay.finalState,
    action: entry.action,
    events,
  };
}
