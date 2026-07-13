import { describe, expect, it } from 'vitest';
import type { GameState, MatchParameters, PlayerState } from '@phalanxduel/shared';
import { DEFAULT_MATCH_PARAMS } from '@phalanxduel/shared';
import { applyAction, checkVictory, createInitialState, resolveAttack } from '../src/index.js';

const TIMESTAMP = '2026-07-13T00:00:00.000Z';

function parametersWithInitiative(
  deployFirst: 'P1' | 'P2',
  attackFirst: 'P1' | 'P2',
): MatchParameters {
  return {
    ...DEFAULT_MATCH_PARAMS,
    classic: {
      ...DEFAULT_MATCH_PARAMS.classic,
      initiative: { deployFirst, attackFirst },
    },
    initiative: { deployFirst, attackFirst },
  };
}

function initialState(params = DEFAULT_MATCH_PARAMS): GameState {
  return createInitialState({
    matchId: '00000000-0000-4000-8000-000000000345',
    players: [
      { id: '00000000-0000-4000-8000-000000000001', name: 'P1' },
      { id: '00000000-0000-4000-8000-000000000002', name: 'P2' },
    ],
    rngSeed: 34305,
    drawTimestamp: TIMESTAMP,
    matchParams: params,
  });
}

function swapPlayers(state: GameState): GameState {
  return {
    ...structuredClone(state),
    players: [structuredClone(state.players[1]!), structuredClone(state.players[0]!)] as [
      PlayerState,
      PlayerState,
    ],
    activePlayerIndex: state.activePlayerIndex === 0 ? 1 : 0,
    passState: state.passState
      ? {
          consecutivePasses: [
            state.passState.consecutivePasses[1],
            state.passState.consecutivePasses[0],
          ],
          totalPasses: [state.passState.totalPasses[1], state.passState.totalPasses[0]],
        }
      : undefined,
    reinforcement: state.reinforcement
      ? {
          ...state.reinforcement,
          attackerIndex: state.reinforcement.attackerIndex === 0 ? 1 : 0,
        }
      : undefined,
    outcome: state.outcome
      ? {
          ...state.outcome,
          winnerIndex:
            state.outcome.winnerIndex === null ? null : state.outcome.winnerIndex === 0 ? 1 : 0,
        }
      : state.outcome,
    liveness: undefined,
    transactionLog: undefined,
  };
}

function physicalState(state: GameState): unknown {
  return state.players.map((player) => ({
    lifepoints: player.lifepoints,
    hand: player.hand,
    battlefield: player.battlefield,
    drawpile: player.drawpile,
    discardPile: player.discardPile,
  }));
}

describe('metamorphic player and initiative symmetry', () => {
  it('mirrors deployment initiative when the declared seat is mirrored', () => {
    const p1First = applyAction(
      initialState(parametersWithInitiative('P1', 'P2')),
      { type: 'system:init', timestamp: TIMESTAMP },
      { allowSystemInit: true },
    );
    const p2First = applyAction(
      initialState(parametersWithInitiative('P2', 'P1')),
      { type: 'system:init', timestamp: TIMESTAMP },
      { allowSystemInit: true },
    );

    expect(p1First.activePlayerIndex).toBe(0);
    expect(p2First.activePlayerIndex).toBe(1);
  });

  it('maps a decisive victory to the opposite seat under player exchange', () => {
    const state = initialState();
    state.players[0]!.lifepoints = 0;

    expect(checkVictory(state)).toEqual({ winnerIndex: 1, victoryType: 'lpDepletion' });
    expect(checkVictory(swapPlayers(state))).toEqual({
      winnerIndex: 0,
      victoryType: 'lpDepletion',
    });
  });

  it('commutes combat resolution with player exchange', () => {
    const params: MatchParameters = {
      ...parametersWithInitiative('P2', 'P1'),
      classic: {
        ...parametersWithInitiative('P2', 'P1').classic,
        modes: {
          ...parametersWithInitiative('P2', 'P1').classic.modes,
          quickStart: true,
        },
      },
      modeQuickStart: true,
    };
    const active = applyAction(
      initialState(params),
      { type: 'system:init', timestamp: TIMESTAMP },
      { allowSystemInit: true },
    );
    const original = resolveAttack(active, 0, 0, 0).state;
    const mirrored = resolveAttack(swapPlayers(active), 1, 0, 0).state;

    expect(physicalState(swapPlayers(mirrored))).toEqual(physicalState(original));
  });
});
