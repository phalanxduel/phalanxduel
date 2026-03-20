import { describe, it, expect } from 'vitest';
import { createInitialState, applyAction } from '../src/index.ts';
import { filterStateForPlayer } from '../../server/src/match.ts';
import type { GameState, Card } from '@phalanxduel/shared';

const MOCK_TIMESTAMP = '2026-03-20T12:00:00.000Z';

describe('Fog of War - Implementation Verification', () => {
  it('Engine: Cards deployed during DeploymentPhase are faceDown', () => {
    const initial = createInitialState({
      matchId: '00000000-0000-0000-0000-000000000000',
      players: [
        { id: 'p1', name: 'Alice' },
        { id: 'p2', name: 'Bob' },
      ],
      rngSeed: 1,
    });

    let state = applyAction(initial, { type: 'system:init', timestamp: MOCK_TIMESTAMP });

    // Bob (P2) deploys first according to DEFAULT_MATCH_PARAMS
    const bobCard = state.players[1].hand[0];
    state = applyAction(state, {
      type: 'deploy',
      playerIndex: 1,
      column: 0,
      cardId: bobCard.id,
      timestamp: MOCK_TIMESTAMP,
    });

    const deployedCard = state.players[1].battlefield[0];
    expect(deployedCard?.faceDown).toBe(true);
  });

  it('Engine: Cards flip face-up when AttackPhase begins', () => {
    const initial = createInitialState({
      matchId: '00000000-0000-0000-0000-000000000000',
      players: [
        { id: 'p1', name: 'Alice' },
        { id: 'p2', name: 'Bob' },
      ],
      rngSeed: 1,
    });

    let state = applyAction(initial, { type: 'system:init', timestamp: MOCK_TIMESTAMP });

    // Deploy all 8 cards (4 each)
    const rows = state.params.rows;
    const cols = state.params.columns;
    const totalToDeploy = rows * cols * 2;

    for (let i = 0; i < totalToDeploy; i++) {
      const activeIdx = state.activePlayerIndex;
      const card = state.players[activeIdx].hand[0];
      // Find an empty col for this player
      let col = 0;
      for (let c = 0; col < cols; c++) {
        const gridIdx0 = 0 * cols + c;
        const gridIdx1 = 1 * cols + c;
        if (
          state.players[activeIdx].battlefield[gridIdx0] === null ||
          state.players[activeIdx].battlefield[gridIdx1] === null
        ) {
          col = c;
          break;
        }
      }

      state = applyAction(state, {
        type: 'deploy',
        playerIndex: activeIdx,
        column: col,
        cardId: card.id,
        timestamp: MOCK_TIMESTAMP,
      });
    }

    expect(state.phase).toBe('AttackPhase');
    // All cards should be face-up now
    state.players.forEach((ps) => {
      ps.battlefield.forEach((cell) => {
        if (cell) expect(cell.faceDown).toBe(false);
      });
    });
  });

  it('Server: redactHiddenCards filters face-down battlefield cards for opponent', () => {
    const initial = createInitialState({
      matchId: '00000000-0000-0000-0000-000000000000',
      players: [
        { id: 'p1', name: 'Alice' },
        { id: 'p2', name: 'Bob' },
      ],
      rngSeed: 1,
    });

    let state = applyAction(initial, { type: 'system:init', timestamp: MOCK_TIMESTAMP });

    // Bob (P2) deploys first
    const bobCard = state.players[1].hand[0];
    state = applyAction(state, {
      type: 'deploy',
      playerIndex: 1,
      column: 0,
      cardId: bobCard.id,
      timestamp: MOCK_TIMESTAMP,
    });

    // Filter state for Alice (P1, index 0)
    // Alice should NOT see Bob's card details
    const aliceView = filterStateForPlayer(state, 0);
    const bobCardInAliceView = aliceView.players[1].battlefield[0];

    expect(bobCardInAliceView?.faceDown).toBe(true);
    expect(bobCardInAliceView?.card.face).toBe('?');
    expect(bobCardInAliceView?.card.value).toBe(0);

    // But Bob should still see his own card
    const bobView = filterStateForPlayer(state, 1);
    const bobCardInBobView = bobView.players[1].battlefield[0];
    expect(bobCardInBobView?.card.face).not.toBe('?');
    expect(bobCardInBobView?.card.value).not.toBe(0);
  });

  it('Server: redactTransactionLog redacts card IDs and combat details', () => {
    const initial = createInitialState({
      matchId: '00000000-0000-0000-0000-000000000000',
      players: [
        { id: 'p1', name: 'Alice' },
        { id: 'p2', name: 'Bob' },
      ],
      rngSeed: 1,
    });

    let state = applyAction(initial, { type: 'system:init', timestamp: MOCK_TIMESTAMP });

    const bobCard = state.players[1].hand[0];
    state = applyAction(state, {
      type: 'deploy',
      playerIndex: 1,
      column: 0,
      cardId: bobCard.id,
      timestamp: MOCK_TIMESTAMP,
    });

    const filtered = filterStateForPlayer(state, 0);
    const lastEntry = filtered.transactionLog?.at(-1);

    expect(lastEntry?.action.type).toBe('deploy');
    // @ts-expect-error - we know it's a deploy action
    expect(lastEntry?.action.cardId).toBe('hidden');
  });

  it('Server: redactHiddenCards filters discard pile for opponent (shows only top card)', () => {
    const initial = createInitialState({
      matchId: '00000000-0000-0000-0000-000000000000',
      players: [
        { id: 'p1', name: 'Alice' },
        { id: 'p2', name: 'Bob' },
      ],
      rngSeed: 1,
    });

    // Setup state where Bob has 2 cards in discard pile
    const card1: Card = { id: 'c1', suit: 'hearts', face: 'A', value: 1, type: 'ace' };
    const card2: Card = { id: 'c2', suit: 'spades', face: 'K', value: 13, type: 'king' };

    const state: GameState = {
      ...initial,
      players: [
        initial.players[0],
        {
          ...initial.players[1],
          discardPile: [card1, card2],
        },
      ],
    };

    // Alice (index 0) views Bob's (index 1) state
    const aliceView = filterStateForPlayer(state, 0);
    const bobDiscardInAliceView = aliceView.players[1].discardPile;

    expect(bobDiscardInAliceView).toHaveLength(1);
    expect(bobDiscardInAliceView[0].id).toBe('c2'); // Top card
    expect(aliceView.players[1].discardPileCount).toBe(2);

    // Bob (index 1) views his own state
    const bobView = filterStateForPlayer(state, 1);
    expect(bobView.players[1].discardPile).toHaveLength(2);
    expect(bobView.players[1].discardPileCount).toBe(2);
  });
});
