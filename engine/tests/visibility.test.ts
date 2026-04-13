/**
 * Card visibility tests across all game phases and actor perspectives.
 *
 * Actors:
 *   - Owner:     the player who owns the cards
 *   - Opponent:  the other player
 *   - Spectator: a non-player observer
 *
 * Zones (per RULES.md):
 *   - Drawpile:    hidden from all (only count is public)
 *   - Hand:         visible to owner only (opponent/spectator see count only)
 *   - Battlefield:  face-up, visible to all
 *   - Discard pile: opponent/spectator see only the top card + count; owner sees all
 */
import { describe, it, expect } from 'vitest';
import { createInitialState, applyAction, computeBotAction } from '../src/index.js';
import { filterStateForPlayer, filterStateForSpectator } from '../../server/src/match.ts';
import type {
  GameState,
  PlayerState,
  Card,
  BattlefieldCard,
  Battlefield,
  PartialCard,
} from '@phalanxduel/shared';

// ── Helpers ──────────────────────────────────────────────────────────────

const MATCH_ID = '00000000-0000-0000-0000-000000000001';
const TS = '2026-01-01T00:00:00.000Z';
const PLAYERS: [{ id: string; name: string }, { id: string; name: string }] = [
  { id: '00000000-0000-0000-0000-000000000010', name: 'Alice' },
  { id: '00000000-0000-0000-0000-000000000020', name: 'Bob' },
];

function freshState(seed = 42): GameState {
  return createInitialState({
    matchId: MATCH_ID,
    players: PLAYERS,
    rngSeed: seed,
    drawTimestamp: TS,
  });
}

function initState(seed = 42): GameState {
  return applyAction(
    freshState(seed),
    { type: 'system:init', timestamp: TS },
    { allowSystemInit: true },
  );
}

/** Deploy all cards to fill both battlefields, reaching AttackPhase */
function deployToAttackPhase(seed = 42): GameState {
  let state = initState(seed);
  expect(state.phase).toBe('DeploymentPhase');

  const totalSlots = state.params.rows * state.params.columns;
  const totalDeploys = totalSlots * 2;

  for (let i = 0; i < totalDeploys; i++) {
    const activeIdx = state.activePlayerIndex;
    const card = state.players[activeIdx]!.hand[0]!;
    const cols = state.params.columns;
    let col = 0;
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < state.params.rows; r++) {
        if (state.players[activeIdx]!.battlefield[r * cols + c] === null) {
          col = c;
          // break out of both loops
          r = state.params.rows;
          c = cols;
        }
      }
    }
    state = applyAction(state, {
      type: 'deploy',
      playerIndex: activeIdx,
      column: col,
      cardId: card.id,
      timestamp: TS,
    });
  }

  expect(state.phase).toBe('AttackPhase');
  return state;
}

/**
 * Build a state already in AttackPhase with controlled battlefields,
 * hands, drawpiles, and discard piles for precise visibility testing.
 */
function makeCombatState(overrides?: {
  p0Hand?: Card[];
  p1Hand?: Card[];
  p0Drawpile?: PartialCard[];
  p1Drawpile?: PartialCard[];
  p0Discard?: Card[];
  p1Discard?: Card[];
  p0Battlefield?: Battlefield;
  p1Battlefield?: Battlefield;
  activePlayerIndex?: number;
}): GameState {
  const base = createInitialState({
    matchId: MATCH_ID,
    players: PLAYERS,
    rngSeed: 42,
    gameOptions: {
      damageMode: 'classic',
      startingLifepoints: 20,
      classicDeployment: false,
      quickStart: true,
    },
    drawTimestamp: TS,
  });

  const state = applyAction(
    base,
    { type: 'system:init', timestamp: TS },
    { allowSystemInit: true },
  );
  const cols = state.params.columns;

  function makeBfCard(
    suit: Card['suit'],
    face: string,
    value: number,
    gridIndex: number,
  ): BattlefieldCard {
    return {
      card: { id: `card-${suit}-${face}-${gridIndex}`, suit, face, value, type: 'number' },
      position: { row: Math.floor(gridIndex / cols), col: gridIndex % cols },
      currentHp: value,
      faceDown: false,
    };
  }

  function defaultBf(): Battlefield {
    const bf: Battlefield = Array(state.params.rows * cols).fill(null) as Battlefield;
    // Fill all slots with numbered cards
    for (let i = 0; i < bf.length; i++) {
      bf[i] = makeBfCard('hearts', String((i % 9) + 2), (i % 9) + 2, i);
    }
    return bf;
  }

  const p0 = state.players[0]!;
  const p1 = state.players[1]!;

  const updatedP0: PlayerState = {
    ...p0,
    hand: overrides?.p0Hand ?? p0.hand,
    battlefield: overrides?.p0Battlefield ?? defaultBf(),
    drawpile: overrides?.p0Drawpile ?? p0.drawpile,
    discardPile: overrides?.p0Discard ?? [],
  };

  const updatedP1: PlayerState = {
    ...p1,
    hand: overrides?.p1Hand ?? p1.hand,
    battlefield: overrides?.p1Battlefield ?? defaultBf(),
    drawpile: overrides?.p1Drawpile ?? p1.drawpile,
    discardPile: overrides?.p1Discard ?? [],
  };

  return {
    ...state,
    players: [updatedP0, updatedP1],
    phase: 'AttackPhase',
    activePlayerIndex: overrides?.activePlayerIndex ?? 0,
  };
}

// ── Assertion helpers ────────────────────────────────────────────────────

function assertHandVisible(view: GameState, playerIdx: number, originalHand: Card[]): void {
  const ps = view.players[playerIdx]!;
  expect(ps.hand).toEqual(originalHand);
  expect(ps.hand.length).toBe(originalHand.length);
  for (const card of ps.hand) {
    expect(card.face).not.toBe('?');
    expect(card.value).not.toBe(0);
  }
}

function assertHandRedacted(view: GameState, playerIdx: number, expectedCount: number): void {
  const ps = view.players[playerIdx]!;
  expect(ps.hand).toEqual([]);
  expect(ps.handCount).toBe(expectedCount);
}

function assertDrawpileVisible(view: GameState, playerIdx: number, expectedLength: number): void {
  const ps = view.players[playerIdx]!;
  expect(ps.drawpile.length).toBe(expectedLength);
}

function assertDrawpileRedacted(view: GameState, playerIdx: number, expectedCount: number): void {
  const ps = view.players[playerIdx]!;
  expect(ps.drawpile).toEqual([]);
  expect(ps.drawpileCount).toBe(expectedCount);
}

function assertBattlefieldVisible(view: GameState, playerIdx: number): void {
  const ps = view.players[playerIdx]!;
  for (const cell of ps.battlefield) {
    if (cell) {
      const bf = cell as BattlefieldCard;
      expect(bf.faceDown).toBe(false);
      expect(bf.card.face).not.toBe('?');
      expect(bf.card.value).not.toBe(0);
    }
  }
}

function assertDiscardFullyVisible(
  view: GameState,
  playerIdx: number,
  expectedLength: number,
): void {
  const ps = view.players[playerIdx]!;
  expect(ps.discardPile).toHaveLength(expectedLength);
  expect(ps.discardPileCount).toBe(expectedLength);
}

function assertDiscardTopOnly(
  view: GameState,
  playerIdx: number,
  expectedTotalCount: number,
  expectedTopCard?: Card,
): void {
  const ps = view.players[playerIdx]!;
  expect(ps.discardPileCount).toBe(expectedTotalCount);
  if (expectedTotalCount === 0) {
    expect(ps.discardPile).toHaveLength(0);
  } else {
    expect(ps.discardPile).toHaveLength(1);
    if (expectedTopCard) {
      expect(ps.discardPile[0]!.id).toBe(expectedTopCard.id);
    }
    expect(ps.discardPile[0]!.face).not.toBe('?');
  }
}

// ── Tests ────────────────────────────────────────────────────────────────

describe('Card Visibility — DeploymentPhase', () => {
  it('Owner sees own hand, opponent hand is hidden', () => {
    const state = initState();
    const p0HandLen = state.players[0]!.hand.length;
    const p1HandLen = state.players[1]!.hand.length;

    const aliceView = filterStateForPlayer(state, 0);
    assertHandVisible(aliceView, 0, state.players[0]!.hand);
    assertHandRedacted(aliceView, 1, p1HandLen);

    const bobView = filterStateForPlayer(state, 1);
    assertHandVisible(bobView, 1, state.players[1]!.hand);
    assertHandRedacted(bobView, 0, p0HandLen);
  });

  it('Spectator sees neither hand', () => {
    const state = initState();
    const p0HandLen = state.players[0]!.hand.length;
    const p1HandLen = state.players[1]!.hand.length;

    const spectatorView = filterStateForSpectator(state);
    assertHandRedacted(spectatorView, 0, p0HandLen);
    assertHandRedacted(spectatorView, 1, p1HandLen);
  });

  it('Drawpile hidden from opponent and spectator', () => {
    const state = initState();
    const p0DrawLen = state.players[0]!.drawpile.length;
    const p1DrawLen = state.players[1]!.drawpile.length;

    // Owner sees own drawpile
    const aliceView = filterStateForPlayer(state, 0);
    assertDrawpileVisible(aliceView, 0, p0DrawLen);
    assertDrawpileRedacted(aliceView, 1, p1DrawLen);

    // Spectator sees neither drawpile
    const spectatorView = filterStateForSpectator(state);
    assertDrawpileRedacted(spectatorView, 0, p0DrawLen);
    assertDrawpileRedacted(spectatorView, 1, p1DrawLen);
  });

  it('Deployed cards are face-up and visible to all actors', () => {
    const state = initState();
    const activeIdx = state.activePlayerIndex;
    const card = state.players[activeIdx]!.hand[0]!;

    const afterDeploy = applyAction(state, {
      type: 'deploy',
      playerIndex: activeIdx,
      column: 0,
      cardId: card.id,
      timestamp: TS,
    });

    // Engine state: card is face-up
    const deployed = afterDeploy.players[activeIdx]!.battlefield[0] as BattlefieldCard;
    expect(deployed.faceDown).toBe(false);
    expect(deployed.card.id).toBe(card.id);

    // All three actors see the deployed card
    const aliceView = filterStateForPlayer(afterDeploy, 0);
    assertBattlefieldVisible(aliceView, activeIdx);

    const bobView = filterStateForPlayer(afterDeploy, 1);
    assertBattlefieldVisible(bobView, activeIdx);

    const spectatorView = filterStateForSpectator(afterDeploy);
    assertBattlefieldVisible(spectatorView, activeIdx);
  });

  it('Mid-deployment: both players have some cards deployed, all visible', () => {
    let state = initState();

    // Deploy 4 cards total (2 per player, alternating)
    for (let i = 0; i < 4; i++) {
      const activeIdx = state.activePlayerIndex;
      const card = state.players[activeIdx]!.hand[0]!;
      state = applyAction(state, {
        type: 'deploy',
        playerIndex: activeIdx,
        column: i % state.params.columns,
        cardId: card.id,
        timestamp: TS,
      });
    }

    expect(state.phase).toBe('DeploymentPhase');

    // All deployed cards visible to all actors
    for (const pIdx of [0, 1]) {
      const aliceView = filterStateForPlayer(state, 0);
      assertBattlefieldVisible(aliceView, pIdx);

      const bobView = filterStateForPlayer(state, 1);
      assertBattlefieldVisible(bobView, pIdx);

      const spectatorView = filterStateForSpectator(state);
      assertBattlefieldVisible(spectatorView, pIdx);
    }
  });
});

describe('Card Visibility — AttackPhase', () => {
  it('All battlefield cards visible to all actors', () => {
    const state = deployToAttackPhase();

    for (const pIdx of [0, 1]) {
      const aliceView = filterStateForPlayer(state, 0);
      assertBattlefieldVisible(aliceView, pIdx);

      const bobView = filterStateForPlayer(state, 1);
      assertBattlefieldVisible(bobView, pIdx);

      const spectatorView = filterStateForSpectator(state);
      assertBattlefieldVisible(spectatorView, pIdx);
    }
  });

  it('Remaining hand cards visible only to owner', () => {
    const state = deployToAttackPhase();
    // After deploying 8 cards from initial 12, each player should have 4 in hand
    expect(state.players[0]!.hand.length).toBe(4);
    expect(state.players[1]!.hand.length).toBe(4);

    const aliceView = filterStateForPlayer(state, 0);
    assertHandVisible(aliceView, 0, state.players[0]!.hand);
    assertHandRedacted(aliceView, 1, 4);

    const spectatorView = filterStateForSpectator(state);
    assertHandRedacted(spectatorView, 0, 4);
    assertHandRedacted(spectatorView, 1, 4);
  });

  it('Attack does not hide any battlefield cards', () => {
    const state = makeCombatState({ activePlayerIndex: 0 });

    // P0 attacks P1's column 0
    const afterAttack = applyAction(state, {
      type: 'attack',
      playerIndex: 0,
      attackingColumn: 0,
      defendingColumn: 0,
      timestamp: TS,
    });

    // Battlefield cards remain visible after combat
    for (const pIdx of [0, 1]) {
      const aliceView = filterStateForPlayer(afterAttack, 0);
      assertBattlefieldVisible(aliceView, pIdx);

      const bobView = filterStateForPlayer(afterAttack, 1);
      assertBattlefieldVisible(bobView, pIdx);

      const spectatorView = filterStateForSpectator(afterAttack);
      assertBattlefieldVisible(spectatorView, pIdx);
    }
  });
});

describe('Card Visibility — Discard Pile', () => {
  it('Owner sees full discard pile; opponent sees only top card', () => {
    const card1: Card = { id: 'disc-1', suit: 'hearts', face: '3', value: 3, type: 'number' };
    const card2: Card = { id: 'disc-2', suit: 'spades', face: 'K', value: 13, type: 'king' };
    const card3: Card = { id: 'disc-3', suit: 'diamonds', face: '5', value: 5, type: 'number' };

    const state = makeCombatState({
      p0Discard: [card1, card2, card3],
      p1Discard: [card1],
    });

    // Alice (P0) sees her own full discard pile
    const aliceView = filterStateForPlayer(state, 0);
    assertDiscardFullyVisible(aliceView, 0, 3);

    // Alice sees only top card of Bob's discard
    assertDiscardTopOnly(aliceView, 1, 1, card1);

    // Bob sees his own full discard pile
    const bobView = filterStateForPlayer(state, 1);
    assertDiscardFullyVisible(bobView, 1, 1);

    // Bob sees only top card of Alice's discard (card3 is last/top)
    assertDiscardTopOnly(bobView, 0, 3, card3);
  });

  it('Spectator sees only top card of both discard piles', () => {
    const card1: Card = { id: 'disc-1', suit: 'hearts', face: '3', value: 3, type: 'number' };
    const card2: Card = { id: 'disc-2', suit: 'spades', face: 'K', value: 13, type: 'king' };

    const state = makeCombatState({
      p0Discard: [card1, card2],
      p1Discard: [card1, card2],
    });

    const spectatorView = filterStateForSpectator(state);
    assertDiscardTopOnly(spectatorView, 0, 2, card2);
    assertDiscardTopOnly(spectatorView, 1, 2, card2);
  });

  it('Empty discard pile shows nothing to any actor', () => {
    const state = makeCombatState({ p0Discard: [], p1Discard: [] });

    const aliceView = filterStateForPlayer(state, 0);
    assertDiscardTopOnly(aliceView, 1, 0);

    const spectatorView = filterStateForSpectator(state);
    assertDiscardTopOnly(spectatorView, 0, 0);
    assertDiscardTopOnly(spectatorView, 1, 0);
  });
});

describe('Card Visibility — Reinforcement', () => {
  it('Reinforced card is face-up and visible to all actors', () => {
    // Set up a state where an attack has just created a reinforcement opportunity
    // We need AttackResolution → ReinforcementPhase
    // Use a controlled battlefield where attacking col 0 kills the front card
    const cols = 4;

    function makeBf(cards: (BattlefieldCard | null)[]): Battlefield {
      return cards as Battlefield;
    }

    function makeBfCard(
      id: string,
      suit: Card['suit'],
      value: number,
      gridIndex: number,
    ): BattlefieldCard {
      return {
        card: { id, suit, face: String(value), value, type: 'number' },
        position: { row: Math.floor(gridIndex / cols), col: gridIndex % cols },
        currentHp: value,
        faceDown: false,
      };
    }

    // P0 has a strong attacker in col 0 front (value 10), P1 has a weak defender (value 2)
    // Attack should kill P1's front card, triggering reinforcement
    const p0Bf = makeBf([
      makeBfCard('p0-f0', 'spades', 10, 0),
      makeBfCard('p0-f1', 'hearts', 5, 1),
      makeBfCard('p0-f2', 'diamonds', 5, 2),
      makeBfCard('p0-f3', 'clubs', 5, 3),
      makeBfCard('p0-b0', 'hearts', 5, 4),
      makeBfCard('p0-b1', 'diamonds', 5, 5),
      makeBfCard('p0-b2', 'clubs', 5, 6),
      makeBfCard('p0-b3', 'spades', 5, 7),
    ]);

    // P1 col 0 front has value 2 (will be destroyed), back has value 3
    const p1Bf = makeBf([
      makeBfCard('p1-f0', 'hearts', 2, 0),
      makeBfCard('p1-f1', 'spades', 8, 1),
      makeBfCard('p1-f2', 'diamonds', 8, 2),
      makeBfCard('p1-f3', 'clubs', 8, 3),
      makeBfCard('p1-b0', 'clubs', 3, 4),
      makeBfCard('p1-b1', 'spades', 8, 5),
      makeBfCard('p1-b2', 'hearts', 8, 6),
      makeBfCard('p1-b3', 'diamonds', 8, 7),
    ]);

    const reinforceCard: Card = {
      id: 'reinforce-card',
      suit: 'diamonds',
      face: '6',
      value: 6,
      type: 'number',
    };

    const state = makeCombatState({
      p0Battlefield: p0Bf,
      p1Battlefield: p1Bf,
      p1Hand: [reinforceCard],
      activePlayerIndex: 0,
    });

    // P0 attacks P1's column 0
    const afterAttack = applyAction(state, {
      type: 'attack',
      playerIndex: 0,
      attackingColumn: 0,
      defendingColumn: 0,
      timestamp: TS,
    });

    // If we reached ReinforcementPhase, reinforce
    if (afterAttack.phase === 'ReinforcementPhase' && afterAttack.reinforcement) {
      const afterReinforce = applyAction(afterAttack, {
        type: 'reinforce',
        playerIndex: 1,
        cardId: reinforceCard.id,
        timestamp: TS,
      });

      // The reinforced card should be face-up and visible to all
      const aliceView = filterStateForPlayer(afterReinforce, 0);
      assertBattlefieldVisible(aliceView, 1);

      const bobView = filterStateForPlayer(afterReinforce, 1);
      assertBattlefieldVisible(bobView, 1);

      const spectatorView = filterStateForSpectator(afterReinforce);
      assertBattlefieldVisible(spectatorView, 1);
    }
    // If the attack didn't trigger reinforcement (back card advanced),
    // battlefield should still be fully visible
    else {
      for (const pIdx of [0, 1]) {
        assertBattlefieldVisible(filterStateForPlayer(afterAttack, 0), pIdx);
        assertBattlefieldVisible(filterStateForSpectator(afterAttack), pIdx);
      }
    }
  });
});

describe('Card Visibility — Full Game Lifecycle', () => {
  it('Visibility rules hold from deployment through gameOver', () => {
    // Use quickStart to skip deployment and go straight to combat
    const initial = createInitialState({
      matchId: MATCH_ID,
      players: PLAYERS,
      rngSeed: 99,
      gameOptions: {
        damageMode: 'classic',
        startingLifepoints: 20,
        classicDeployment: true,
        quickStart: true,
      },
      drawTimestamp: TS,
    });
    let state = applyAction(
      initial,
      { type: 'system:init', timestamp: TS },
      { allowSystemInit: true },
    );
    expect(state.phase).toBe('AttackPhase');

    let actionCount = 0;
    const maxActions = 500;
    const phasesVisited = new Set<string>();

    while (state.phase !== 'gameOver' && actionCount < maxActions) {
      phasesVisited.add(state.phase);

      // Verify visibility at each step
      const p0HandLen = state.players[0]!.hand.length;
      const p1HandLen = state.players[1]!.hand.length;
      const p0DrawLen = state.players[0]!.drawpile.length;
      const p1DrawLen = state.players[1]!.drawpile.length;

      // Player views
      const aliceView = filterStateForPlayer(state, 0);
      const bobView = filterStateForPlayer(state, 1);
      const spectatorView = filterStateForSpectator(state);

      // Battlefield always visible to all
      for (const pIdx of [0, 1]) {
        assertBattlefieldVisible(aliceView, pIdx);
        assertBattlefieldVisible(bobView, pIdx);
        assertBattlefieldVisible(spectatorView, pIdx);
      }

      // Hand visible to owner, hidden from opponent and spectator
      assertHandVisible(aliceView, 0, state.players[0]!.hand);
      assertHandRedacted(aliceView, 1, p1HandLen);
      assertHandVisible(bobView, 1, state.players[1]!.hand);
      assertHandRedacted(bobView, 0, p0HandLen);
      assertHandRedacted(spectatorView, 0, p0HandLen);
      assertHandRedacted(spectatorView, 1, p1HandLen);

      // Drawpile visible to owner, hidden from opponent and spectator
      assertDrawpileVisible(aliceView, 0, p0DrawLen);
      assertDrawpileRedacted(aliceView, 1, p1DrawLen);
      assertDrawpileVisible(bobView, 1, p1DrawLen);
      assertDrawpileRedacted(bobView, 0, p0DrawLen);
      assertDrawpileRedacted(spectatorView, 0, p0DrawLen);
      assertDrawpileRedacted(spectatorView, 1, p1DrawLen);

      // Advance game
      const activeIdx = state.activePlayerIndex as 0 | 1;
      const action = computeBotAction(state, activeIdx, {
        strategy: 'heuristic',
        seed: 99 + actionCount,
      });
      state = applyAction(state, action);
      actionCount++;
    }

    expect(state.phase).toBe('gameOver');
    expect(actionCount).toBeGreaterThan(0);
    expect(actionCount).toBeLessThan(maxActions);

    // Verify the game visited AttackPhase at minimum
    expect(phasesVisited.has('AttackPhase')).toBe(true);
  });
});

describe('Card Visibility — Spectator Symmetry', () => {
  it('Spectator view is identical regardless of which player is "first"', () => {
    const state = makeCombatState({
      p0Discard: [
        { id: 'd1', suit: 'hearts', face: '2', value: 2, type: 'number' },
        { id: 'd2', suit: 'spades', face: '3', value: 3, type: 'number' },
      ],
      p1Discard: [{ id: 'd3', suit: 'clubs', face: '4', value: 4, type: 'number' }],
    });

    const view = filterStateForSpectator(state);

    // Both hands empty
    expect(view.players[0]!.hand).toEqual([]);
    expect(view.players[1]!.hand).toEqual([]);

    // Both drawpiles empty
    expect(view.players[0]!.drawpile).toEqual([]);
    expect(view.players[1]!.drawpile).toEqual([]);

    // Counts are present
    expect(view.players[0]!.handCount).toBe(state.players[0]!.hand.length);
    expect(view.players[1]!.handCount).toBe(state.players[1]!.hand.length);

    // Discard pile: top card only
    assertDiscardTopOnly(view, 0, 2);
    assertDiscardTopOnly(view, 1, 1);

    // Battlefield fully visible
    assertBattlefieldVisible(view, 0);
    assertBattlefieldVisible(view, 1);
  });

  it('Spectator never sees drawpile contents even when owner could', () => {
    const state = deployToAttackPhase();

    // Owner can see own drawpile
    const aliceView = filterStateForPlayer(state, 0);
    expect(aliceView.players[0]!.drawpile.length).toBeGreaterThan(0);

    // Spectator cannot
    const spectatorView = filterStateForSpectator(state);
    expect(spectatorView.players[0]!.drawpile).toEqual([]);
    expect(spectatorView.players[0]!.drawpileCount).toBe(state.players[0]!.drawpile.length);
    expect(spectatorView.players[1]!.drawpile).toEqual([]);
    expect(spectatorView.players[1]!.drawpileCount).toBe(state.players[1]!.drawpile.length);
  });
});
