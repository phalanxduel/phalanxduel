import { describe, it, expect } from 'vitest';
import type { GameState, TransactionLogEntry } from '@phalanxduel/shared';
import { DEFAULT_MATCH_PARAMS } from '@phalanxduel/shared';
import {
  fullHouseDetector,
  deuceCoupDetector,
  tripleThreatDetector,
  deadMansHandDetector,
} from '../src/achievements/detectors.js';
import type { DetectorContext } from '../src/achievements/detector.js';

const MATCH_ID = '00000000-0000-4000-8000-000000000099';
const PLAYER_ID_1 = '00000000-0000-4000-8000-000000000001';
const PLAYER_ID_2 = '00000000-0000-4000-8000-000000000002';

function makeCard(id: string, face: string, suit = 'spades' as const) {
  const faceToValue: Record<string, number> = {
    A: 1,
    '2': 2,
    '3': 3,
    '4': 4,
    '5': 5,
    '6': 6,
    '7': 7,
    '8': 8,
    '9': 9,
    T: 10,
    J: 11,
    Q: 11,
    K: 11,
  };
  const faceToType = (f: string): 'number' | 'ace' | 'jack' | 'queen' | 'king' =>
    f === 'A' ? 'ace' : f === 'J' ? 'jack' : f === 'Q' ? 'queen' : f === 'K' ? 'king' : 'number';
  return { id, suit, face, value: faceToValue[face] ?? 0, type: faceToType(face) };
}

function makeBfCard(id: string, face: string, col: number, row: number) {
  return {
    card: makeCard(id, face),
    position: { col, row },
    currentHp: 10,
    faceDown: false,
  };
}

function makeBaseState(overrides: Partial<GameState> = {}): GameState {
  return {
    matchId: MATCH_ID,
    specVersion: '1.0',
    params: DEFAULT_MATCH_PARAMS,
    players: [
      {
        player: { id: PLAYER_ID_1, name: 'P1' },
        hand: [],
        battlefield: [],
        drawpile: [],
        discardPile: [],
        lifepoints: 20,
        deckSeed: 1,
      },
      {
        player: { id: PLAYER_ID_2, name: 'P2' },
        hand: [],
        battlefield: [],
        drawpile: [],
        discardPile: [],
        lifepoints: 20,
        deckSeed: 2,
      },
    ],
    activePlayerIndex: 0,
    phase: 'gameOver',
    turnNumber: 5,
    outcome: { winnerIndex: 0, victoryType: 'lpDepletion', turnNumber: 5 },
    transactionLog: [],
    ...overrides,
  } as GameState;
}

function makeCtx(overrides: Partial<DetectorContext> = {}): DetectorContext {
  return {
    matchId: MATCH_ID,
    winnerIndex: 0,
    loserIndex: 1,
    finalState: makeBaseState(),
    transactionLog: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// FULL_HOUSE
// ---------------------------------------------------------------------------
describe('fullHouseDetector', () => {
  it('awards FULL_HOUSE when player has 3+2 of same face', () => {
    const battlefield = [
      makeBfCard('c1', '7', 0, 0),
      makeBfCard('c2', '7', 1, 0),
      makeBfCard('c3', '7', 2, 0),
      makeBfCard('c4', 'K', 3, 0),
      makeBfCard('c5', 'K', 0, 1),
    ];
    const state = makeBaseState({
      players: [{ ...makeBaseState().players[0]!, battlefield }, makeBaseState().players[1]!],
    });
    const results = fullHouseDetector(makeCtx({ finalState: state }));
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ type: 'FULL_HOUSE', playerIndex: 0 });
  });

  it('does not award when counts are 2+2', () => {
    const battlefield = [
      makeBfCard('c1', '7', 0, 0),
      makeBfCard('c2', '7', 1, 0),
      makeBfCard('c3', 'K', 2, 0),
      makeBfCard('c4', 'K', 3, 0),
    ];
    const state = makeBaseState({
      players: [{ ...makeBaseState().players[0]!, battlefield }, makeBaseState().players[1]!],
    });
    const results = fullHouseDetector(makeCtx({ finalState: state }));
    expect(results).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// DEUCE_COUP
// ---------------------------------------------------------------------------
describe('deuceCoupDetector', () => {
  function makeAttackEntry(
    attackerPlayerIndex: number,
    destroyedFaces: string[],
  ): TransactionLogEntry {
    return {
      sequenceNumber: 1,
      action: {
        type: 'attack',
        playerIndex: attackerPlayerIndex,
        attackingColumn: 0,
        defendingColumn: 0,
        timestamp: '2026-01-01T00:00:00.000Z',
      },
      stateHashBefore: 'a',
      stateHashAfter: 'b',
      timestamp: '2026-01-01T00:00:00.000Z',
      details: {
        type: 'attack',
        reinforcementTriggered: false,
        victoryTriggered: false,
        combat: {
          turnNumber: 1,
          attackerPlayerIndex,
          attackerCard: makeCard('atk', 'A'),
          targetColumn: 0,
          baseDamage: 5,
          totalLpDamage: 0,
          steps: destroyedFaces.map((face, i) => ({
            target: 'frontCard' as const,
            card: makeCard(`d${i}`, face),
            damage: 10,
            hpBefore: 5,
            hpAfter: 0,
          })),
        },
      },
    } as unknown as TransactionLogEntry;
  }

  it('awards DEUCE_COUP when two 2s destroyed in one attack', () => {
    const entry = makeAttackEntry(0, ['2', '2']);
    const results = deuceCoupDetector(makeCtx({ transactionLog: [entry] }));
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ type: 'DEUCE_COUP', playerIndex: 0 });
  });

  it('does not award when only one 2 destroyed', () => {
    const entry = makeAttackEntry(0, ['2', 'K']);
    const results = deuceCoupDetector(makeCtx({ transactionLog: [entry] }));
    expect(results).toHaveLength(0);
  });

  it('awards only once per player even across multiple attacks', () => {
    const e1 = makeAttackEntry(0, ['2', '2']);
    const e2 = makeAttackEntry(0, ['2', '2']);
    const results = deuceCoupDetector(makeCtx({ transactionLog: [e1, e2] }));
    expect(results).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// TRIPLE_THREAT
// ---------------------------------------------------------------------------
describe('tripleThreatDetector', () => {
  function makeDeployEntry(playerIndex: number, cardId: string, seq: number): TransactionLogEntry {
    return {
      sequenceNumber: seq,
      action: {
        type: 'deploy',
        playerIndex,
        column: 0,
        cardId,
        timestamp: '2026-01-01T00:00:00.000Z',
      },
      stateHashBefore: 'a',
      stateHashAfter: 'b',
      timestamp: '2026-01-01T00:00:00.000Z',
      details: { type: 'deploy', gridIndex: 0, phaseAfter: 'DeploymentPhase' },
    } as unknown as TransactionLogEntry;
  }

  it('awards TRIPLE_THREAT for three consecutive same-face deploys', () => {
    // Three cards with face '7' deployed by player 0
    const state = makeBaseState({
      players: [
        {
          ...makeBaseState().players[0]!,
          discardPile: [makeCard('c1', '7'), makeCard('c2', '7'), makeCard('c3', '7')],
        },
        makeBaseState().players[1]!,
      ],
    });
    const txLog = [
      makeDeployEntry(0, 'c1', 1),
      makeDeployEntry(0, 'c2', 2),
      makeDeployEntry(0, 'c3', 3),
    ];
    const results = tripleThreatDetector(makeCtx({ finalState: state, transactionLog: txLog }));
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ type: 'TRIPLE_THREAT', playerIndex: 0 });
  });

  it('does not award when faces differ in the run', () => {
    const state = makeBaseState({
      players: [
        {
          ...makeBaseState().players[0]!,
          discardPile: [makeCard('c1', '7'), makeCard('c2', '8'), makeCard('c3', '7')],
        },
        makeBaseState().players[1]!,
      ],
    });
    const txLog = [
      makeDeployEntry(0, 'c1', 1),
      makeDeployEntry(0, 'c2', 2),
      makeDeployEntry(0, 'c3', 3),
    ];
    const results = tripleThreatDetector(makeCtx({ finalState: state, transactionLog: txLog }));
    expect(results).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// DEAD_MANS_HAND
// ---------------------------------------------------------------------------
describe('deadMansHandDetector', () => {
  it('awards DEAD_MANS_HAND when Ace and 8 are in back rank', () => {
    const { rows, columns } = DEFAULT_MATCH_PARAMS;
    // Back rank slot for col 0 = 0 * rows + (rows - 1)
    const backSlot0 = 0 * rows + (rows - 1);
    const backSlot1 = 1 * rows + (rows - 1);
    const battlefield = new Array(rows * columns).fill(null);
    battlefield[backSlot0] = makeBfCard('ace1', 'A', 0, rows - 1);
    battlefield[backSlot1] = makeBfCard('eight1', '8', 1, rows - 1);

    const state = makeBaseState({
      players: [{ ...makeBaseState().players[0]!, battlefield }, makeBaseState().players[1]!],
    });
    const results = deadMansHandDetector(makeCtx({ finalState: state }));
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ type: 'DEAD_MANS_HAND', playerIndex: 0 });
  });

  it('does not award when only Ace is in back rank', () => {
    const { rows, columns } = DEFAULT_MATCH_PARAMS;
    const backSlot0 = 0 * rows + (rows - 1);
    const battlefield = new Array(rows * columns).fill(null);
    battlefield[backSlot0] = makeBfCard('ace1', 'A', 0, rows - 1);

    const state = makeBaseState({
      players: [{ ...makeBaseState().players[0]!, battlefield }, makeBaseState().players[1]!],
    });
    const results = deadMansHandDetector(makeCtx({ finalState: state }));
    expect(results).toHaveLength(0);
  });
});
