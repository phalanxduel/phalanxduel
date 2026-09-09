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

export function spectatorDelayTurns(): number {
  const configured = Number.parseInt(process.env.SPECTATOR_DELAY_TURNS ?? '', 10);
  if (Number.isFinite(configured) && configured >= 0) return configured;
  return process.env.APP_ENV === 'local' ? 0 : DEFAULT_SPECTATOR_DELAY_TURNS;
}

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
  delayTurns = spectatorDelayTurns(),
): SpectatorFrame | null {
  if (delayTurns > 0 && delayTurns < MINIMUM_SPECTATOR_DELAY_TURNS) {
    throw new Error(`spectator delay must be at least ${MINIMUM_SPECTATOR_DELAY_TURNS} turns`);
  }
  if (!match.state || !match.config) return null;

  if (delayTurns === 0) {
    const action = match.actionHistory.at(-1) ?? { type: 'system:init', timestamp: new Date().toISOString() };
    return {
      preState: match.lastPreState ?? match.state,
      postState: match.state,
      action,
      events: match.lastEvents ?? [],
    };
  }

  const replay = replayGameAtOrBeforeTurn(
    match.config,
    match.actionHistory,
    match.state.turnNumber - delayTurns,
    { hashFn: computeStateHash },
  );
  if (!replay.valid) {
    console.warn('[SpectatorDelay] Replay reconstruction failed', {
      matchId: match.matchId,
      turn: match.state.turnNumber,
      delayTurns,
      actionCount: match.actionHistory.length,
      failedAtIndex: replay.failedAtIndex,
      error: replay.error,
    });
    return null;
  }

  const entry = replay.finalState.transactionLog?.at(-1);
  if (!entry) {
    console.warn('[SpectatorDelay] Replay produced no transaction entry', {
      matchId: match.matchId,
      turn: match.state.turnNumber,
      delayTurns,
      actionCount: match.actionHistory.length,
    });
    return null;
  }
  const events = deriveEventsFromEntry(entry, match.matchId);
  return {
    preState: replay.preState,
    postState: replay.finalState,
    action: entry.action,
    events,
  };
}
