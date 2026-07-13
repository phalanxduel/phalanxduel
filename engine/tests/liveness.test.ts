import { describe, expect, it } from 'vitest';
import type { Action, GameState, LivenessState } from '@phalanxduel/shared';
import { DEFAULT_MATCH_PARAMS, GameStateSchema } from '@phalanxduel/shared';
import {
  LIVENESS_POLICY,
  applyAction,
  createInitialState,
  evaluateLiveness,
  hasIrreversibleProgress,
  progressMarker,
  semanticPositionSignature,
} from '../src/index.js';

const TIMESTAMP = '2026-07-13T00:00:00.000Z';
const PASS: Action = { type: 'pass', playerIndex: 0, timestamp: TIMESTAMP };

function activeState(specVersion: '3.0' | '2.0' | '1.0' = '3.0'): GameState {
  const state = createInitialState({
    matchId: '00000000-0000-4000-8000-000000000344',
    players: [
      { id: '00000000-0000-4000-8000-000000000001', name: 'P1' },
      { id: '00000000-0000-4000-8000-000000000002', name: 'P2' },
    ],
    rngSeed: 34304,
    drawTimestamp: TIMESTAMP,
    gameOptions: {
      damageMode: 'classic',
      startingLifepoints: 20,
      classicDeployment: true,
      quickStart: true,
    },
    matchParams: {
      ...DEFAULT_MATCH_PARAMS,
      specVersion,
      classic: {
        ...DEFAULT_MATCH_PARAMS.classic,
        modes: { ...DEFAULT_MATCH_PARAMS.classic.modes, quickStart: true },
      },
      modeQuickStart: true,
    },
  });
  return applyAction(
    state,
    { type: 'system:init', timestamp: TIMESTAMP },
    { allowSystemInit: true },
  );
}

function withLiveness(state: GameState, patch: Partial<LivenessState>): GameState {
  const base = state.liveness ?? {
    positionOccurrences: [{ signature: semanticPositionSignature(state), count: 1 }],
    noProgressTurns: 0,
    progressMarker: progressMarker(state),
  };
  return { ...state, liveness: { ...base, ...patch } };
}

describe('competitive v3.0 liveness policy', () => {
  it('uses the approved threefold, no-progress, and hard-turn defaults', () => {
    expect(LIVENESS_POLICY).toEqual({
      repetitionOccurrences: 3,
      noProgressTurns: 50,
      hardTurnLimit: 200,
    });
  });

  it('builds an exact position witness while excluding audit and liveness metadata', () => {
    const state = activeState();
    const equivalent = structuredClone(state);
    equivalent.transactionLog = [];
    equivalent.liveness = undefined;

    expect(semanticPositionSignature(equivalent)).toBe(semanticPositionSignature(state));

    equivalent.players[0]!.lifepoints -= 1;
    expect(semanticPositionSignature(equivalent)).not.toBe(semanticPositionSignature(state));
  });

  it('distinguishes every continuation-relevant position dimension', () => {
    const state = activeState();
    const signature = semanticPositionSignature(state);
    const mutations: Array<(candidate: GameState) => void> = [
      (candidate) => {
        candidate.specVersion = '2.0';
        candidate.params.specVersion = '2.0';
      },
      (candidate) => {
        candidate.phase = 'ReinforcementPhase';
      },
      (candidate) => {
        candidate.activePlayerIndex = candidate.activePlayerIndex === 0 ? 1 : 0;
      },
      (candidate) => {
        candidate.passState!.totalPasses[0] += 1;
      },
      (candidate) => {
        candidate.players[0]!.deckSeed += 1;
      },
      (candidate) => {
        candidate.players[0]!.lifepoints -= 1;
      },
      (candidate) => {
        candidate.players[0]!.hand.reverse();
      },
      (candidate) => {
        const slot = candidate.players[0]!.battlefield.find((card) => card !== null)!;
        slot.currentHp += 1;
      },
      (candidate) => {
        const slot = candidate.players[0]!.battlefield.find((card) => card !== null)!;
        slot.faceDown = !slot.faceDown;
      },
      (candidate) => {
        const slot = candidate.players[0]!.battlefield.find((card) => card !== null)!;
        slot.card.face = slot.card.face === 'A' ? '2' : 'A';
      },
      (candidate) => {
        const slot = candidate.players[0]!.battlefield.find((card) => card !== null)!;
        slot.card.suit = slot.card.suit === 'spades' ? 'hearts' : 'spades';
      },
      (candidate) => {
        candidate.players[0]!.battlefield.reverse();
      },
      (candidate) => {
        candidate.players[0]!.drawpile.reverse();
      },
      (candidate) => {
        candidate.players[0]!.discardPile.push(candidate.players[0]!.drawpile.pop()!);
      },
    ];

    for (const mutate of mutations) {
      const candidate = structuredClone(state);
      mutate(candidate);
      expect(semanticPositionSignature(candidate)).not.toBe(signature);
    }
  });

  it('computes the progress vector exactly with non-empty zones', () => {
    const state = activeState();
    state.players[0]!.discardPile.push(state.players[0]!.drawpile.pop()!);

    expect(progressMarker(state)).toEqual({
      totalLifepoints: state.players[0]!.lifepoints + state.players[1]!.lifepoints,
      totalBattlefieldHp: state.players
        .flatMap((player) => player.battlefield)
        .reduce((sum, slot) => sum + (slot?.currentHp ?? 0), 0),
      totalDrawpileCards: state.players[0]!.drawpile.length + state.players[1]!.drawpile.length,
      totalDiscardedCards: 1,
    });
  });

  it('draws on the third exact occurrence but not the second', () => {
    const state = activeState();
    const probe = applyAction(state, PASS);
    const repeatedSignature = probe.liveness!.positionOccurrences.at(-1)!.signature;

    const twice = applyAction(
      withLiveness(state, {
        positionOccurrences: [{ signature: repeatedSignature, count: 1 }],
      }),
      PASS,
    );
    expect(twice.phase).toBe('AttackPhase');
    expect(twice.liveness?.positionOccurrences[0]?.count).toBe(2);

    const threefold = applyAction(
      withLiveness(state, {
        positionOccurrences: [{ signature: repeatedSignature, count: 2 }],
      }),
      PASS,
    );
    expect(threefold.phase).toBe('gameOver');
    expect(threefold.liveness?.positionOccurrences).toEqual([
      { signature: repeatedSignature, count: 3 },
    ]);
    expect(threefold.outcome).toEqual({
      winnerIndex: null,
      victoryType: 'repetitionDraw',
      turnNumber: 1,
    });
    expect(threefold.transactionLog?.at(-1)?.phaseTrace?.at(-1)).toEqual({
      from: 'AttackPhase',
      trigger: 'system:draw',
      to: 'gameOver',
    });
    expect(GameStateSchema.safeParse(threefold).success).toBe(true);
  });

  it('draws at exactly 50 completed turns without irreversible progress', () => {
    const state = withLiveness(activeState(), { noProgressTurns: 49 });
    const result = applyAction(state, PASS);

    expect(result.liveness?.noProgressTurns).toBe(50);
    expect(result.outcome?.winnerIndex).toBeNull();
    expect(result.outcome?.victoryType).toBe('noProgressDraw');
  });

  it('draws after completing turn 200 and records the completed turn', () => {
    const state = withLiveness({ ...activeState(), turnNumber: 200 }, { noProgressTurns: 0 });
    const result = applyAction(state, PASS);

    expect(result.outcome).toEqual({
      winnerIndex: null,
      victoryType: 'turnLimitDraw',
      turnNumber: 200,
    });
  });

  it('applies deterministic draw precedence at a shared boundary', () => {
    const state = { ...activeState(), turnNumber: 200 };
    const probe = applyAction(state, PASS);
    const repeatedSignature = probe.liveness!.positionOccurrences.at(-1)!.signature;
    const prepared = withLiveness(state, {
      positionOccurrences: [{ signature: repeatedSignature, count: 2 }],
      noProgressTurns: 49,
    });

    expect(applyAction(prepared, PASS).outcome?.victoryType).toBe('repetitionDraw');
  });

  it('recognizes each declared irreversible-progress dimension', () => {
    const marker = progressMarker(activeState());
    expect(
      hasIrreversibleProgress(marker, { ...marker, totalLifepoints: marker.totalLifepoints - 1 }),
    ).toBe(true);
    expect(
      hasIrreversibleProgress(marker, {
        ...marker,
        totalBattlefieldHp: marker.totalBattlefieldHp - 1,
      }),
    ).toBe(true);
    expect(
      hasIrreversibleProgress(marker, {
        ...marker,
        totalDrawpileCards: marker.totalDrawpileCards - 1,
      }),
    ).toBe(true);
    expect(
      hasIrreversibleProgress(marker, {
        ...marker,
        totalDiscardedCards: marker.totalDiscardedCards + 1,
      }),
    ).toBe(true);
    expect(hasIrreversibleProgress(marker, marker)).toBe(false);
  });

  it.each([
    {
      type: 'attack',
      playerIndex: 0,
      attackingColumn: 0,
      defendingColumn: 0,
      timestamp: TIMESTAMP,
    },
    { type: 'pass', playerIndex: 0, timestamp: TIMESTAMP },
    { type: 'reinforce', playerIndex: 0, cardId: 'probe', timestamp: TIMESTAMP },
  ] as const)('recognizes a completed turn for $type', (action) => {
    const state = activeState();
    const result = evaluateLiveness(state, { ...state, turnNumber: state.turnNumber + 1 }, action);

    expect(result?.completedTurnNumber).toBe(state.turnNumber);
    expect(result?.liveness.noProgressTurns).toBe(1);
  });

  it.each([
    { type: 'system:init', timestamp: TIMESTAMP },
    { type: 'deploy', playerIndex: 0, cardId: 'probe', column: 0, timestamp: TIMESTAMP },
    { type: 'forfeit', playerIndex: 0, timestamp: TIMESTAMP },
  ] as const)('does not resolve liveness draws for non-turn-boundary $type', (action) => {
    const state = withLiveness({ ...activeState(), turnNumber: 200 }, { noProgressTurns: 50 });
    const result = evaluateLiveness(state, { ...state, turnNumber: 201 }, action);

    expect(result?.completedTurnNumber).toBeNull();
    expect(result?.drawReason).toBeNull();
    expect(result?.liveness.noProgressTurns).toBe(50);
  });

  it('does not resolve liveness draws when the turn number did not advance', () => {
    const state = withLiveness({ ...activeState(), turnNumber: 200 }, { noProgressTurns: 50 });
    const result = evaluateLiveness(state, state, PASS);

    expect(result?.completedTurnNumber).toBeNull();
    expect(result?.drawReason).toBeNull();
  });

  it.each(['2.0', '1.0'] as const)('does not alter historical %s replay state', (version) => {
    const state = activeState(version);
    expect(state.liveness).toBeUndefined();
    expect(
      evaluateLiveness(state, { ...state, turnNumber: state.turnNumber + 1 }, PASS),
    ).toBeNull();
  });
});
