import { describe, expect, it } from 'vitest';
import type { Action, GameState } from '@phalanxduel/shared';
import { computeStateHash } from '@phalanxduel/shared/hash';
import {
  applyAction,
  createInitialState,
  getValidActions,
  type GameConfig,
} from '@phalanxduel/engine';
import type { MatchInstance } from '../src/match-types';
import {
  buildDelayedSpectatorFrame,
  DEFAULT_SPECTATOR_DELAY_TURNS,
  MINIMUM_SPECTATOR_DELAY_TURNS,
} from '../src/utils/spectator-delay';

const TS = '2026-07-13T00:00:00.000Z';
const CONFIG: GameConfig = {
  matchId: '00000000-0000-0000-0000-000000000707',
  players: [
    { id: '00000000-0000-0000-0000-000000000001', name: 'Alice' },
    { id: '00000000-0000-0000-0000-000000000002', name: 'Bob' },
  ],
  rngSeed: 707,
  drawTimestamp: TS,
};

function progressToTurn(targetTurn: number): { state: GameState; actions: Action[] } {
  let state = applyAction(
    createInitialState(CONFIG),
    { type: 'system:init', timestamp: TS },
    { allowSystemInit: true, hashFn: computeStateHash },
  );
  const actions: Action[] = [];

  for (let guard = 0; state.turnNumber < targetTurn && guard < 300; guard += 1) {
    const candidates = getValidActions(state, state.activePlayerIndex);
    const action =
      candidates.find((candidate) => candidate.type !== 'pass' && candidate.type !== 'forfeit') ??
      candidates.find((candidate) => candidate.type === 'pass') ??
      candidates[0];
    if (!action) throw new Error(`No action available in ${state.phase}`);
    state = applyAction(state, action, { hashFn: computeStateHash });
    actions.push(action);
    if (state.phase === 'gameOver') break;
  }

  if (state.turnNumber < targetTurn) {
    throw new Error(
      `Fixture stopped at turn ${state.turnNumber}, phase ${state.phase}, actions ${actions.length}, outcome ${JSON.stringify(state.outcome)}`,
    );
  }
  return { state, actions };
}

function buildMatch(state: GameState, actionHistory: Action[]): MatchInstance {
  return {
    matchId: CONFIG.matchId,
    players: [null, null],
    spectators: [],
    state,
    config: CONFIG,
    actionHistory,
    lastPreState: null,
    lifecycleEvents: [],
    fatalEvents: [],
    createdAt: Date.parse(TS),
    lastActivityAt: Date.parse(TS),
  };
}

describe('live spectator delay', () => {
  it('reconstructs a frame at least the default three turns behind', () => {
    const { state, actions } = progressToTurn(4);
    const frame = buildDelayedSpectatorFrame(buildMatch(state, actions));

    expect(DEFAULT_SPECTATOR_DELAY_TURNS).toBe(3);
    expect(frame).not.toBeNull();
    expect(state.turnNumber - frame!.postState.turnNumber).toBeGreaterThanOrEqual(
      DEFAULT_SPECTATOR_DELAY_TURNS,
    );
    expect(frame!.postState.transactionLog?.length).toBeLessThan(state.transactionLog!.length);
  });

  it('enforces the locked two-turn minimum floor', () => {
    const { state, actions } = progressToTurn(2);
    const match = buildMatch(state, actions);

    expect(MINIMUM_SPECTATOR_DELAY_TURNS).toBe(2);
    expect(() => buildDelayedSpectatorFrame(match, 1)).toThrow('at least 2 turns');
  });

  it('fails closed when authoritative replay cannot reconstruct the delayed frame', () => {
    const { state } = progressToTurn(4);
    const invalid: Action = {
      type: 'attack',
      playerIndex: 0,
      attackingColumn: 11,
      defendingColumn: 11,
      timestamp: TS,
    };

    expect(buildDelayedSpectatorFrame(buildMatch(state, [invalid]))).toBeNull();
  });
});
