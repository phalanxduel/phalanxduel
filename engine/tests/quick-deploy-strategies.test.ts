import { describe, expect, it } from 'vitest';
import type { Action, GameState } from '@phalanxduel/shared';
import { PhalanxEventSchema, TelemetryName } from '@phalanxduel/shared';
import {
  applyAction,
  deriveEventsFromEntry,
  getDeployTarget,
  getValidActions,
  replayGame,
  type GameConfig,
} from '../src/index.ts';

const TIMESTAMP = '2026-08-03T12:00:00.000Z';

function config(seed = 42): GameConfig {
  return {
    matchId: '00000000-0000-4000-8000-000000000383',
    players: [
      { id: '00000000-0000-4000-8000-000000000001', name: 'Alice' },
      { id: '00000000-0000-4000-8000-000000000002', name: 'Bob' },
    ],
    rngSeed: seed,
    drawTimestamp: TIMESTAMP,
  };
}

function initialized(seed = 42): GameState {
  return replayGame(config(seed), []).finalState;
}

function manualDeploy(state: GameState): GameState {
  const playerIndex = state.activePlayerIndex as 0 | 1;
  const player = state.players[playerIndex]!;
  const column = Array.from({ length: state.params.columns }, (_, index) => index).find(
    (candidate) =>
      getDeployTarget(player.battlefield, candidate, state.params.rows, state.params.columns) !==
      null,
  );
  if (column === undefined || !player.hand[0]) throw new Error('Expected a legal manual deploy');
  return applyAction(state, {
    type: 'deploy',
    playerIndex,
    column,
    cardId: player.hand[0].id,
    timestamp: TIMESTAMP,
  });
}

function rowValues(state: GameState, playerIndex: 0 | 1, row: number): number[] {
  const player = state.players[playerIndex]!;
  return Array.from(
    { length: state.params.columns },
    (_, column) => player.battlefield[row * state.params.columns + column]!.card.value,
  );
}

describe('quick deploy strategies', () => {
  it('offers all strategies alongside ordinary manual deployments', () => {
    const state = initialized();
    const actions = getValidActions(state, state.activePlayerIndex, TIMESTAMP);

    expect(actions.filter((action) => action.type === 'quickDeploy')).toEqual([
      { type: 'quickDeploy', playerIndex: 1, strategy: 'defensive', timestamp: TIMESTAMP },
      { type: 'quickDeploy', playerIndex: 1, strategy: 'aggressive', timestamp: TIMESTAMP },
      { type: 'quickDeploy', playerIndex: 1, strategy: 'random', timestamp: TIMESTAMP },
    ]);
    expect(actions.some((action) => action.type === 'deploy')).toBe(true);
  });

  it('automates only the opted-in player while preserving alternating manual turns', () => {
    let state = initialized();
    const quickPlayerOpeningIds = new Set(state.players[1]!.hand.map((card) => card.id));

    state = applyAction(state, {
      type: 'quickDeploy',
      playerIndex: 1,
      strategy: 'aggressive',
      timestamp: TIMESTAMP,
    });

    expect(state.activePlayerIndex).toBe(0);
    expect(state.players[1]!.battlefield.filter(Boolean)).toHaveLength(1);
    expect(state.players[0]!.battlefield.filter(Boolean)).toHaveLength(0);

    state = manualDeploy(state);
    expect(state.activePlayerIndex).toBe(0);
    expect(state.players[0]!.battlefield.filter(Boolean)).toHaveLength(1);
    expect(state.players[1]!.battlefield.filter(Boolean)).toHaveLength(2);

    while (state.phase === 'DeploymentPhase') state = manualDeploy(state);

    expect(state.phase).toBe('AttackPhase');
    for (const player of state.players) {
      expect(player.battlefield.filter(Boolean)).toHaveLength(8);
      expect(player.hand).toHaveLength(4);
    }
    const quickPlayerFinalIds = [
      ...state.players[1]!.hand.map((card) => card.id),
      ...state.players[1]!.battlefield.flatMap((slot) => (slot ? [slot.card.id] : [])),
    ];
    expect(new Set(quickPlayerFinalIds)).toEqual(quickPlayerOpeningIds);
  });

  it('puts strength forward for Aggressive and behind weaker cards for Defensive', () => {
    let state = initialized();
    state = applyAction(state, {
      type: 'quickDeploy',
      playerIndex: 1,
      strategy: 'defensive',
      timestamp: TIMESTAMP,
    });
    state = applyAction(state, {
      type: 'quickDeploy',
      playerIndex: 0,
      strategy: 'aggressive',
      timestamp: TIMESTAMP,
    });

    expect(state.phase).toBe('AttackPhase');
    expect(Math.min(...rowValues(state, 0, 0))).toBeGreaterThanOrEqual(
      Math.max(...rowValues(state, 0, 1)),
    );
    for (let column = 0; column < state.params.columns; column++) {
      const front = state.players[1]!.battlefield[column]!.card.value;
      const back = state.players[1]!.battlefield[state.params.columns + column]!.card.value;
      expect(back).toBeGreaterThanOrEqual(front);
    }
  });

  it('replays Random quick deploy identically from the same authoritative inputs', () => {
    let state = initialized(383);
    state = applyAction(state, {
      type: 'quickDeploy',
      playerIndex: 1,
      strategy: 'random',
      timestamp: TIMESTAMP,
    });
    state = applyAction(state, {
      type: 'quickDeploy',
      playerIndex: 0,
      strategy: 'random',
      timestamp: TIMESTAMP,
    });

    const actions = (state.transactionLog ?? []).slice(1).map((entry) => entry.action) as Action[];
    const replayed = replayGame(config(383), actions);

    expect(replayed.valid).toBe(true);
    expect(replayed.finalState).toEqual(state);

    const quickEntries = (state.transactionLog ?? []).filter(
      (entry) => entry.details.type === 'quickDeploy',
    );
    for (const entry of quickEntries) {
      if (entry.details.type !== 'quickDeploy') continue;
      const events = deriveEventsFromEntry(entry, state.matchId).filter(
        (event) => event.name === TelemetryName.EVENT_DEPLOY,
      );
      expect(events).toHaveLength(entry.details.deployments.length);
      for (const event of events) expect(PhalanxEventSchema.safeParse(event).success).toBe(true);
    }
  });
});
