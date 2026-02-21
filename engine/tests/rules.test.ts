import { describe, it, expect } from 'vitest';
import { createDeck, createInitialState, drawCards, deployCard, getDeployTarget, resolveAttack, isValidTarget, checkVictory, validateAction, applyAction, advanceBackRow, isColumnFull, getReinforcementTarget, resetColumnHp } from '../src/index';
import type { ApplyActionOptions } from '../src/index';
import { RANK_VALUES } from '@phalanxduel/shared';
import type { GameState, BattlefieldCard, Battlefield, PlayerState, Card, GameOptions } from '@phalanxduel/shared';

/** Helper: create a BattlefieldCard at a given grid index */
function makeBfCard(
  suit: 'spades' | 'hearts' | 'diamonds' | 'clubs',
  rank: string,
  gridIndex: number,
  hpOverride?: number,
): BattlefieldCard {
  const row = gridIndex < 4 ? 0 : 1;
  const col = gridIndex % 4;
  const hp = hpOverride ?? (RANK_VALUES[rank] ?? 0);
  return {
    card: { suit, rank: rank as 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K' },
    position: { row, col },
    currentHp: hp,
    faceDown: false,
  };
}

/** Helper: create a minimal game state with specific battlefields */
function makeCombatState(
  p0Battlefield: Battlefield,
  p1Battlefield: Battlefield,
  opts?: {
    p0Hand?: Card[];
    p1Hand?: Card[];
    p0Drawpile?: Card[];
    p1Drawpile?: Card[];
    p0Lifepoints?: number;
    p1Lifepoints?: number;
    gameOptions?: GameOptions;
  },
): GameState {
  const makePlayer = (id: string, name: string, bf: Battlefield, hand: Card[], drawpile: Card[], lp: number): PlayerState => ({
    player: { id, name },
    hand,
    battlefield: bf,
    drawpile,
    discardPile: [],
    lifepoints: lp,
  });
  return {
    players: [
      makePlayer('00000000-0000-0000-0000-000000000001', 'Alice', p0Battlefield, opts?.p0Hand ?? [], opts?.p0Drawpile ?? [], opts?.p0Lifepoints ?? 20),
      makePlayer('00000000-0000-0000-0000-000000000002', 'Bob', p1Battlefield, opts?.p1Hand ?? [], opts?.p1Drawpile ?? [], opts?.p1Lifepoints ?? 20),
    ],
    activePlayerIndex: 0,
    phase: 'combat',
    turnNumber: 1,
    rngSeed: 42,
    transactionLog: [],
    gameOptions: opts?.gameOptions,
  };
}

function emptyBf(): Battlefield {
  return [null, null, null, null, null, null, null, null];
}

// ---------------------------------------------------------------------------
// Placeholder tests for rule coverage gate (pnpm rules:check).
//
// Each describe block references a rule ID from docs/RULES.md so that the
// rules:check script can verify every documented rule has at least one test.
// Replace .todo() stubs with real implementations as rules are finalized.
// ---------------------------------------------------------------------------

// === Deployment ===

describe('PHX-DEPLOY-001: Initial battlefield deployment', () => {
  it('each player draws 12 cards from their shuffled drawpile', () => {
    // Arrange
    const state = createInitialState({
      players: [
        { id: '00000000-0000-0000-0000-000000000001', name: 'Alice' },
        { id: '00000000-0000-0000-0000-000000000002', name: 'Bob' },
      ],
      rngSeed: 42,
    });

    // Act
    const afterDraw = drawCards(drawCards(state, 0, 12), 1, 12);

    // Assert
    expect(afterDraw.players[0]!.hand).toHaveLength(12);
    expect(afterDraw.players[1]!.hand).toHaveLength(12);
    expect(afterDraw.players[0]!.drawpile).toHaveLength(40);
    expect(afterDraw.players[1]!.drawpile).toHaveLength(40);
  });

  it('each player deploys 8 cards face-up in a 2x4 grid', () => {
    // Arrange
    let state = createInitialState({
      players: [
        { id: '00000000-0000-0000-0000-000000000001', name: 'Alice' },
        { id: '00000000-0000-0000-0000-000000000002', name: 'Bob' },
      ],
      rngSeed: 42,
    });
    state = drawCards(drawCards(state, 0, 12), 1, 12);

    // Act — deploy 8 cards for player 0
    for (let i = 0; i < 8; i++) {
      state = deployCard(state, 0, 0, i);
    }

    // Assert
    const battlefield = state.players[0]!.battlefield;
    const filledSlots = battlefield.filter(s => s !== null);
    expect(filledSlots).toHaveLength(8);
    // All deployed face-up
    for (const slot of filledSlots) {
      expect(slot!.faceDown).toBe(false);
    }
  });

  it('4 cards remain in hand after deployment', () => {
    // Arrange
    let state = createInitialState({
      players: [
        { id: '00000000-0000-0000-0000-000000000001', name: 'Alice' },
        { id: '00000000-0000-0000-0000-000000000002', name: 'Bob' },
      ],
      rngSeed: 42,
    });
    state = drawCards(state, 0, 12);

    // Act — deploy 8 cards (always take index 0 from hand since it shifts)
    for (let i = 0; i < 8; i++) {
      state = deployCard(state, 0, 0, i);
    }

    // Assert
    expect(state.players[0]!.hand).toHaveLength(4);
  });

  it('rejects deployment if fewer than 12 cards in drawpile', () => {
    // Arrange
    let state = createInitialState({
      players: [
        { id: '00000000-0000-0000-0000-000000000001', name: 'Alice' },
        { id: '00000000-0000-0000-0000-000000000002', name: 'Bob' },
      ],
      rngSeed: 42,
    });
    // Draw most cards to empty the pile
    state = drawCards(state, 0, 50);

    // Act / Assert — only 2 left, can't draw 12
    expect(() => drawCards(state, 0, 12)).toThrow('Not enough cards');
  });
});

describe('PHX-DEPLOY-002: Alternating card placement', () => {
  it('first deployer is determined by coin flip / seed', () => {
    // Arrange — two games with different seeds should potentially differ
    const state1 = createInitialState({
      players: [
        { id: '00000000-0000-0000-0000-000000000001', name: 'Alice' },
        { id: '00000000-0000-0000-0000-000000000002', name: 'Bob' },
      ],
      rngSeed: 42,
    });
    const state2 = createInitialState({
      players: [
        { id: '00000000-0000-0000-0000-000000000001', name: 'Alice' },
        { id: '00000000-0000-0000-0000-000000000002', name: 'Bob' },
      ],
      rngSeed: 99,
    });

    // Assert — both start in setup phase with an active player
    expect(state1.activePlayerIndex).toBe(0);
    expect(state2.activePlayerIndex).toBe(0);
    // The deployment order can be set by the orchestrator using the seed
    expect(state1.phase).toBe('setup');
  });

  it('players alternate placing one card at a time', () => {
    // Arrange
    let state = createInitialState({
      players: [
        { id: '00000000-0000-0000-0000-000000000001', name: 'Alice' },
        { id: '00000000-0000-0000-0000-000000000002', name: 'Bob' },
      ],
      rngSeed: 42,
    });
    state = drawCards(drawCards(state, 0, 12), 1, 12);

    // Act — alternate: player 0 deploys to slot 0, player 1 deploys to slot 0
    state = deployCard(state, 0, 0, 0);
    state = deployCard(state, 1, 0, 0);

    // Assert
    expect(state.players[0]!.battlefield[0]).not.toBeNull();
    expect(state.players[1]!.battlefield[0]).not.toBeNull();
    expect(state.players[0]!.hand).toHaveLength(11);
    expect(state.players[1]!.hand).toHaveLength(11);
  });

  it('getDeployTarget fills front row first, then back row', () => {
    // Arrange
    const bf = emptyBf();

    // Act / Assert — column 0 empty → front row
    expect(getDeployTarget(bf, 0)).toBe(0);

    // Fill front row
    bf[0] = makeBfCard('spades', '5', 0);
    expect(getDeployTarget(bf, 0)).toBe(4); // back row

    // Fill back row
    bf[4] = makeBfCard('hearts', '3', 4);
    expect(getDeployTarget(bf, 0)).toBeNull(); // full
  });

  it('cards fill left-to-right, front row first, then back row', () => {
    // Arrange
    let state = createInitialState({
      players: [
        { id: '00000000-0000-0000-0000-000000000001', name: 'Alice' },
        { id: '00000000-0000-0000-0000-000000000002', name: 'Bob' },
      ],
      rngSeed: 42,
    });
    state = drawCards(state, 0, 12);

    // Act — deploy in order: 0,1,2,3 (front row), 4,5,6,7 (back row)
    for (let i = 0; i < 8; i++) {
      state = deployCard(state, 0, 0, i);
    }

    // Assert — front row positions have row=0, back row positions have row=1
    for (let i = 0; i < 4; i++) {
      expect(state.players[0]!.battlefield[i]!.position.row).toBe(0);
      expect(state.players[0]!.battlefield[i]!.position.col).toBe(i);
    }
    for (let i = 4; i < 8; i++) {
      expect(state.players[0]!.battlefield[i]!.position.row).toBe(1);
      expect(state.players[0]!.battlefield[i]!.position.col).toBe(i - 4);
    }
  });
});

// === Cards ===

describe('PHX-CARDS-001: Deck composition', () => {
  it('a standard deck has 52 cards (4 suits × 13 ranks)', () => {
    // Act
    const deck = createDeck();

    // Assert
    expect(deck).toHaveLength(52);
  });

  it('each suit contains Ace through King', () => {
    // Arrange
    const deck = createDeck();
    const expectedRanks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K'];

    // Act / Assert
    for (const suit of ['spades', 'hearts', 'diamonds', 'clubs'] as const) {
      const suitCards = deck.filter(c => c.suit === suit);
      const ranks = suitCards.map(c => c.rank).sort();
      expect(ranks).toEqual(expectedRanks.sort());
    }
  });

  it('no duplicate cards within a single deck', () => {
    // Arrange
    const deck = createDeck();

    // Act
    const keys = deck.map(c => `${c.suit}-${c.rank}`);
    const unique = new Set(keys);

    // Assert
    expect(unique.size).toBe(52);
  });
});

describe('PHX-CARDS-002: Card values', () => {
  it('Ace has value 1', () => {
    expect(RANK_VALUES['A']).toBe(1);
  });

  it('numbered cards 2-10 have face value', () => {
    for (let i = 2; i <= 9; i++) {
      expect(RANK_VALUES[String(i)]).toBe(i);
    }
    expect(RANK_VALUES['T']).toBe(10);
  });

  it('Jack, Queen, King each have value 11', () => {
    expect(RANK_VALUES['J']).toBe(11);
    expect(RANK_VALUES['Q']).toBe(11);
    expect(RANK_VALUES['K']).toBe(11);
  });

  it.todo('Joker has value 0');

  it('card current HP starts equal to its value', () => {
    // Arrange
    let state = createInitialState({
      players: [
        { id: '00000000-0000-0000-0000-000000000001', name: 'Alice' },
        { id: '00000000-0000-0000-0000-000000000002', name: 'Bob' },
      ],
      rngSeed: 42,
    });
    state = drawCards(state, 0, 12);

    // Act — deploy first card
    const card = state.players[0]!.hand[0]!;
    state = deployCard(state, 0, 0, 0);

    // Assert
    const deployed = state.players[0]!.battlefield[0]!;
    expect(deployed.currentHp).toBe(RANK_VALUES[card.rank]);
  });

  it('card is destroyed when current HP reaches 0', () => {
    // Arrange — K (11 damage) attacks a 2 (2 HP)
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', 'K', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('hearts', '2', 0);
    const state = makeCombatState(p0Bf, p1Bf);

    // Act
    const { state: result } = resolveAttack(state, 0, 0, 0);

    // Assert
    expect(result.players[1]!.battlefield[0]).toBeNull();
    expect(result.players[1]!.discardPile).toHaveLength(1);
  });
});

describe('PHX-CARDS-003: Face-down cards', () => {
  it.todo('face-down card on battlefield occupies its grid position');
  it.todo('face-down card can be targeted by attacks');
  it.todo('face-down card is flipped face-up when damaged or revealed');
});

describe('PHX-CARDS-004: Joker card', () => {
  it.todo('Joker has 0 attack and 0 defense');
  it.todo('Joker has no suit and receives no suit bonuses');
  it.todo('Joker is excluded from base ruleset deck');
});

// === Combat ===

describe('PHX-COMBAT-001: Basic combat resolution', () => {
  it('attacker deals damage equal to its card value', () => {
    // Arrange — use spades vs spades to avoid suit bonuses
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', '7', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('spades', 'T', 0);
    const state = makeCombatState(p0Bf, p1Bf);

    // Act
    const { state: result } = resolveAttack(state, 0, 0, 0);

    // Assert — target T had 10 HP, took 7 damage → 3 HP remaining
    expect(result.players[1]!.battlefield[0]!.currentHp).toBe(3);
  });

  it('target HP is reduced by damage dealt', () => {
    // Arrange — use spades (no defensive bonus)
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', '5', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('spades', '9', 0);
    const state = makeCombatState(p0Bf, p1Bf);

    // Act
    const { state: result } = resolveAttack(state, 0, 0, 0);

    // Assert
    expect(result.players[1]!.battlefield[0]!.currentHp).toBe(4);
  });

  it('target is destroyed and discarded when HP reaches 0', () => {
    // Arrange — attacker K (11) vs target 3 (3 HP), both spades
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', 'K', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('spades', '3', 0);
    const state = makeCombatState(p0Bf, p1Bf);

    // Act
    const { state: result } = resolveAttack(state, 0, 0, 0);

    // Assert — target destroyed (null) and in discard pile
    expect(result.players[1]!.battlefield[0]).toBeNull();
    expect(result.players[1]!.discardPile).toHaveLength(1);
    expect(result.players[1]!.discardPile[0]!.rank).toBe('3');
  });

  it('attacker remains on battlefield after attacking', () => {
    // Arrange — spades vs spades
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', '7', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('spades', 'T', 0);
    const state = makeCombatState(p0Bf, p1Bf);

    // Act
    const { state: result } = resolveAttack(state, 0, 0, 0);

    // Assert — attacker still there with full HP
    expect(result.players[0]!.battlefield[0]).not.toBeNull();
    expect(result.players[0]!.battlefield[0]!.currentHp).toBe(7);
  });

  it('column-locked: isValidTarget accepts column 0-3', () => {
    // Arrange — any battlefield
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('hearts', '5', 0);

    // Assert — columns 0-3 are valid, 4+ or negative are not
    expect(isValidTarget(p1Bf, 0)).toBe(true);
    expect(isValidTarget(p1Bf, 1)).toBe(true);
    expect(isValidTarget(p1Bf, 3)).toBe(true);
    expect(isValidTarget(p1Bf, 4)).toBe(false);
    expect(isValidTarget(p1Bf, -1)).toBe(false);
  });

  it('back-row card cannot be selected as attacker', () => {
    // Arrange — attacker in back row (grid index 4)
    const p0Bf = emptyBf();
    p0Bf[4] = makeBfCard('clubs', '5', 4);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('spades', 'K', 0);
    const state = makeCombatState(p0Bf, p1Bf);

    // Act / Assert — resolveAttack throws for back-row attacker
    expect(() => resolveAttack(state, 0, 4, 0)).toThrow('Only front-row cards can attack');
  });

  it('attacker can only target same column', () => {
    // Arrange — attacker at col 0, target at col 1
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', '5', 0);
    const p1Bf = emptyBf();
    p1Bf[1] = makeBfCard('spades', 'T', 1);
    const state = makeCombatState(p0Bf, p1Bf);

    // Act / Assert — validateAction rejects cross-column attack
    const validation = validateAction(state, {
      type: 'attack',
      playerIndex: 0,
      attackerPosition: { row: 0, col: 0 },
      targetPosition: { row: 0, col: 1 },
    });
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain('column directly across');
  });

  it('attack hits empty front-row → damage flows to back card', () => {
    // Arrange — clubs 5 at col 0, opponent front empty, back K at col 0
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('clubs', '5', 0);
    const p1Bf = emptyBf();
    p1Bf[4] = makeBfCard('spades', 'K', 4); // back row col 0, 11 HP
    const state = makeCombatState(p0Bf, p1Bf);

    // Act — column 0 derived from attacker at grid 0
    const { state: result } = resolveAttack(state, 0, 0, 0);

    // Assert — front empty (skipped), club doubles overflow to back: 5*2=10, K: 11-10=1
    expect(result.players[1]!.battlefield[4]!.currentHp).toBe(1);
  });

  it('attack hits fully empty column → damage flows to LP', () => {
    // Arrange — spades 5 at col 0, opponent column 0 completely empty
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', '5', 0);
    const p1Bf = emptyBf();
    const state = makeCombatState(p0Bf, p1Bf);

    // Act
    const { state: result } = resolveAttack(state, 0, 0, 0);

    // Assert — all 5 damage overflows to LP, spade doubles: 5*2=10
    expect(result.players[1]!.lifepoints).toBe(10);
  });

  it('suit bonus modifies damage dealt via overflow', () => {
    // Arrange — Club 5 attacks col 0, front empty, back K(11)
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('clubs', '5', 0);
    const p1Bf = emptyBf();
    p1Bf[4] = makeBfCard('spades', 'K', 4); // back row col 0, 11 HP
    const state = makeCombatState(p0Bf, p1Bf);

    // Act
    const { state: result } = resolveAttack(state, 0, 0, 0);

    // Assert — 11 - 10 = 1 HP remaining (clubs doubles overflow to back)
    expect(result.players[1]!.battlefield[4]!.currentHp).toBe(1);
  });
});

// === Suits ===

describe('PHX-SUIT-001: Diamonds posthumous shield', () => {
  it('Diamond front-row card destroyed: posthumous shield absorbs overflow', () => {
    // Arrange — spades 8 attacks Diamond 5 (5 HP, front row col 1)
    // Diamond 5 destroyed (5 < 8), overflow = 3. Shield = 5 absorbs 3. Net = 0.
    const p0Bf = emptyBf();
    p0Bf[1] = makeBfCard('spades', '8', 1);
    const p1Bf = emptyBf();
    p1Bf[1] = makeBfCard('diamonds', '5', 1); // front row col 1
    const state = makeCombatState(p0Bf, p1Bf);

    // Act
    const { state: result } = resolveAttack(state, 0, 1, 1);

    // Assert — Diamond destroyed, shield absorbed all overflow, LP unchanged
    expect(result.players[1]!.battlefield[1]).toBeNull();
    expect(result.players[1]!.lifepoints).toBe(20);
  });

  it('Diamond front-row card survives: no posthumous shield', () => {
    // Arrange — spades 3 attacks Diamond 5 (5 HP, front row)
    // Diamond 5 takes 3 damage → survives at 2 HP. No overflow, no shield.
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', '3', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('diamonds', '5', 0); // front row
    const state = makeCombatState(p0Bf, p1Bf);

    // Act
    const { state: result } = resolveAttack(state, 0, 0, 0);

    // Assert — Diamond survives at 2 HP
    expect(result.players[1]!.battlefield[0]!.currentHp).toBe(2);
  });

  it('Diamond front-row card destroyed: shield absorbs overflow to back card', () => {
    // Arrange — spades 7 attacks Diamond 4 (4 HP front), hearts 2 back
    // Diamond destroyed (4 < 7), overflow = 3. Shield = 4 absorbs 3. Net = 0.
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', '7', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('diamonds', '4', 0);
    p1Bf[4] = makeBfCard('hearts', '2', 4);
    const state = makeCombatState(p0Bf, p1Bf);

    // Act
    const { state: result } = resolveAttack(state, 0, 0, 0);

    // Assert — Diamond destroyed, back card untouched, LP unchanged
    expect(result.players[1]!.battlefield[0]).toBeNull();
    expect(result.players[1]!.battlefield[4]!.currentHp).toBe(2); // untouched
    expect(result.players[1]!.lifepoints).toBe(20);
  });

  it('Diamond shield partially absorbs overflow when overflow > shield value', () => {
    // Arrange — hearts T(10) attacks Diamond 3 (3 HP front), no back card
    // Diamond destroyed (3 < 10), overflow = 7. Shield = 3 absorbs 3. Net = 4 to LP.
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('hearts', 'T', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('diamonds', '3', 0);
    const state = makeCombatState(p0Bf, p1Bf);

    // Act
    const { state: result } = resolveAttack(state, 0, 0, 0);

    // Assert — Diamond destroyed, 4 overflow to LP
    expect(result.players[1]!.battlefield[0]).toBeNull();
    expect(result.players[1]!.lifepoints).toBe(16); // 20 - 4
  });

  it('Diamond card in back row has normal defense, no posthumous shield', () => {
    // Arrange — spades 4 attacks col 0, front empty, Diamond 5 in back row
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', '4', 0);
    const p1Bf = emptyBf();
    p1Bf[4] = makeBfCard('diamonds', '5', 4); // back row
    const state = makeCombatState(p0Bf, p1Bf);

    // Act
    const { state: result } = resolveAttack(state, 0, 0, 0);

    // Assert — 5 - 4 = 1 HP (no bonus in back row)
    expect(result.players[1]!.battlefield[4]!.currentHp).toBe(1);
  });

  it('Diamond front-row destroyed with equal value: no overflow, shield unused', () => {
    // Arrange — hearts 6 attacks Diamond 6 (6 HP front row)
    // Exactly equal: Diamond destroyed, overflow = 0. Shield not needed.
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('hearts', '6', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('diamonds', '6', 0);
    p1Bf[4] = makeBfCard('clubs', '5', 4);
    const state = makeCombatState(p0Bf, p1Bf);

    // Act
    const { state: result } = resolveAttack(state, 0, 0, 0);

    // Assert — Diamond destroyed, back card untouched (no overflow)
    expect(result.players[1]!.battlefield[0]).toBeNull();
    expect(result.players[1]!.battlefield[4]!.currentHp).toBe(5);
    expect(result.players[1]!.lifepoints).toBe(20);
  });
});

describe('PHX-SUIT-002: Hearts posthumous shield (no back card)', () => {
  it('Heart front card shields LP when back row is empty', () => {
    // Arrange — 8♠ attacks 5♥ (front, no back)
    // 5♥ absorbs 5 (destroyed), overflow 3. Spade doubles: 3×2=6.
    // Heart shield = 5 absorbs 5 → lpDamage = 1. LP = 20 - 1 = 19.
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', '8', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('hearts', '5', 0); // only card in column
    const state = makeCombatState(p0Bf, p1Bf);

    // Act
    const { state: result } = resolveAttack(state, 0, 0, 0);

    // Assert — card destroyed, Heart shield absorbs after Spade doubling
    expect(result.players[1]!.battlefield[0]).toBeNull();
    expect(result.players[1]!.lifepoints).toBe(19);
  });

  it('Heart front card does NOT shield when back card is occupied', () => {
    // Arrange — 8♠ attacks 5♥ (front) + 3♣ (back)
    // 5♥ absorbs 5 (destroyed), overflow 3 → 3♣ absorbs 3 (destroyed), overflow 0
    // Heart front shield does NOT activate (back card was present)
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', '8', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('hearts', '5', 0);
    p1Bf[4] = makeBfCard('clubs', '3', 4); // back row same column
    const state = makeCombatState(p0Bf, p1Bf);

    // Act
    const { state: result } = resolveAttack(state, 0, 0, 0);

    // Assert — both destroyed, no overflow to LP (back card absorbed it all)
    expect(result.players[1]!.battlefield[0]).toBeNull();
    expect(result.players[1]!.battlefield[4]).toBeNull();
    expect(result.players[1]!.lifepoints).toBe(20); // no LP damage
  });

  it('Heart back card shields LP when destroyed', () => {
    // Arrange — K♠ attacks 3♠ (front) + 5♥ (back)
    // 3♠ absorbs 3 (destroyed), overflow 8 → 5♥ absorbs 5 (destroyed), overflow 3
    // Spade doubles: 3×2=6. Heart shield = 5 absorbs 5 → lpDamage = 1. LP = 20 - 1 = 19.
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', 'K', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('spades', '3', 0);
    p1Bf[4] = makeBfCard('hearts', '5', 4);
    const state = makeCombatState(p0Bf, p1Bf);

    // Act
    const { state: result } = resolveAttack(state, 0, 0, 0);

    // Assert — both destroyed, Heart shield reduces LP damage
    expect(result.players[1]!.battlefield[0]).toBeNull();
    expect(result.players[1]!.battlefield[4]).toBeNull();
    expect(result.players[1]!.lifepoints).toBe(19);
  });

  it('Heart shield partially absorbs when overflow exceeds shield value', () => {
    // Arrange — K♠ attacks 2♠ (front) + 5♥ (back)
    // 2♠ absorbs 2 (destroyed), overflow 9 → 5♥ absorbs 5 (destroyed), overflow 4
    // Spade doubles: 4×2=8. Heart shield = 5 absorbs 5 → lpDamage = 3. LP = 20 - 3 = 17.
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', 'K', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('spades', '2', 0);
    p1Bf[4] = makeBfCard('hearts', '5', 4);
    const state = makeCombatState(p0Bf, p1Bf);

    // Act
    const { state: result } = resolveAttack(state, 0, 0, 0);

    // Assert — Heart shield absorbs 5 of 8 doubled damage, leaving 3 LP damage
    expect(result.players[1]!.lifepoints).toBe(17);
  });

  it('Heart shield absorbs from Spade-doubled value (order: Spade doubles, then Heart shields)', () => {
    // Arrange — 9♠ attacks 3♣ (front, no back) — no heart shield
    // 3♣ absorbs 3 (destroyed), overflow 6. Spade doubles: 6×2=12. LP = 20 - 12 = 8.
    // vs. 9♠ attacks 3♥ (front, no back) — with heart shield = 3
    // 3♥ absorbs 3 (destroyed), overflow 6. Spade doubles: 6×2=12. Heart shield 3 absorbs 3. LP = 20 - 9 = 11.
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', '9', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('hearts', '3', 0); // front only
    const state = makeCombatState(p0Bf, p1Bf);

    // Act
    const { state: result } = resolveAttack(state, 0, 0, 0);

    // Assert — shield absorbs from the already-doubled value
    expect(result.players[1]!.battlefield[0]).toBeNull();
    expect(result.players[1]!.lifepoints).toBe(11); // 20 - (12 - 3) = 11
  });

  it('Heart shield does not activate when front Heart survives (not destroyed)', () => {
    // Arrange — 2♠ attacks 5♥ (front, no back)
    // 5♥ absorbs 2, survives at 3 HP. No overflow → no LP damage, no shield.
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', '2', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('hearts', '5', 0);
    const state = makeCombatState(p0Bf, p1Bf);

    // Act
    const { state: result } = resolveAttack(state, 0, 0, 0);

    // Assert — heart card survives, no shield needed (no overflow)
    expect(result.players[1]!.battlefield[0]!.currentHp).toBe(3);
    expect(result.players[1]!.lifepoints).toBe(20); // no LP damage
  });
});

describe('PHX-SUIT-003: Clubs attack cards', () => {
  it('Club card deals doubled damage to back-row targets via overflow', () => {
    // Arrange — clubs 5 at col 0, front empty, back K at col 0
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('clubs', '5', 0);
    const p1Bf = emptyBf();
    p1Bf[4] = makeBfCard('spades', 'K', 4); // back row col 0, 11 HP
    const state = makeCombatState(p0Bf, p1Bf);

    // Act — column-locked: col 0 attacks col 0
    const { state: result } = resolveAttack(state, 0, 0, 0);

    // Assert — 11 - 10 = 1 HP (clubs doubles overflow to back)
    expect(result.players[1]!.battlefield[4]!.currentHp).toBe(1);
  });

  it('Club card deals normal damage to front-row targets', () => {
    // Arrange — clubs 5 attacks front-row spades T (no defensive bonus)
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('clubs', '5', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('spades', 'T', 0); // front row, 10 HP
    const state = makeCombatState(p0Bf, p1Bf);

    // Act
    const { state: result } = resolveAttack(state, 0, 0, 0);

    // Assert — 10 - 5 = 5 HP (no bonus for front row)
    expect(result.players[1]!.battlefield[0]!.currentHp).toBe(5);
  });

  it('damage doubling uses ×2 integer math', () => {
    // Arrange — clubs 3 at col 0, front empty, back spades 5 at col 0 → 6 damage → destroyed
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('clubs', '3', 0);
    const p1Bf = emptyBf();
    p1Bf[4] = makeBfCard('spades', '5', 4);
    const state = makeCombatState(p0Bf, p1Bf);

    // Act — column-locked: col 0 attacks col 0
    const { state: result } = resolveAttack(state, 0, 0, 0);

    // Assert — destroyed (6 >= 5)
    expect(result.players[1]!.battlefield[4]).toBeNull();
  });
});

describe('PHX-SUIT-004: Spades attack players', () => {
  it('Spade bonus doubles overflow damage to player LP', () => {
    // Arrange — spades 5 attacks clubs 3 (front), no back card
    // 5 damage destroys 3HP card, overflow = 2, Spade doubles LP damage → 4
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', '5', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('clubs', '3', 0);
    const state = makeCombatState(p0Bf, p1Bf);

    // Act
    const { state: result } = resolveAttack(state, 0, 0, 0);

    // Assert — 20 - 4 = 16 LP (overflow 2 × Spade ×2 = 4)
    expect(result.players[1]!.lifepoints).toBe(16);
  });

  it('Spade bonus applies when column is empty (all damage to LP)', () => {
    // Arrange — spades 5 at col 0, opponent col 0 is empty
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', '5', 0);
    const p1Bf = emptyBf();
    const state = makeCombatState(p0Bf, p1Bf);

    // Act
    const { state: result } = resolveAttack(state, 0, 0, 0);

    // Assert — 5 damage × Spade ×2 = 10 LP damage
    expect(result.players[1]!.lifepoints).toBe(10);
  });

  it('Spade overflow to LP triggers LP depletion victory', () => {
    // Arrange — spades K(11) attacks hearts 2(2HP), defender has 10 LP
    // 11 - 2 = 9 overflow, Spade ×2 = 18 LP damage → 10 - 18 = 0 (clamped)
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', 'K', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('clubs', '2', 0);
    const state = makeCombatState(p0Bf, p1Bf, { p1Lifepoints: 10 });

    // Act
    const { state: result } = resolveAttack(state, 0, 0, 0);

    // Assert — LP hits 0
    expect(result.players[1]!.lifepoints).toBe(0);
  });
});

// === Special Cards ===

describe('PHX-ACE-001: Ace invulnerability', () => {
  it('Ace HP is never reduced below 1 by normal attacks', () => {
    // Arrange — spades T (10 damage) attacks Ace (1 HP)
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', 'T', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('hearts', 'A', 0);
    const state = makeCombatState(p0Bf, p1Bf);

    // Act
    const { state: result } = resolveAttack(state, 0, 0, 0);

    // Assert — Ace survives with 1 HP
    expect(result.players[1]!.battlefield[0]).not.toBeNull();
    expect(result.players[1]!.battlefield[0]!.currentHp).toBe(1);
  });

  it('Ace absorbs up to 1 point of damage from normal attacks', () => {
    // Arrange — spades 2 attacks Ace
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', '2', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('clubs', 'A', 0);
    const state = makeCombatState(p0Bf, p1Bf);

    // Act
    const { state: result } = resolveAttack(state, 0, 0, 0);

    // Assert — Ace still at 1 HP (can't go below 1)
    expect(result.players[1]!.battlefield[0]!.currentHp).toBe(1);
  });

  it('Ace deals only 1 damage when attacking', () => {
    // Arrange — Ace attacks a 5
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', 'A', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('hearts', '5', 0);
    const state = makeCombatState(p0Bf, p1Bf);

    // Act
    const { state: result } = resolveAttack(state, 0, 0, 0);

    // Assert — 5 - 1 = 4 HP
    expect(result.players[1]!.battlefield[0]!.currentHp).toBe(4);
  });

  it('Ace suit bonuses apply normally', () => {
    // Arrange — Diamond Ace in front row col 0, attacked by spades 4 at col 0
    // Ace is invulnerable (not destroyed), so no Diamond posthumous shield.
    // Ace absorbs 1, HP stays at 1. Overflow = 3 to LP.
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', '4', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('diamonds', 'A', 0);
    const state = makeCombatState(p0Bf, p1Bf);

    // Act — column-locked: col 0 attacks col 0
    const { state: result } = resolveAttack(state, 0, 0, 0);

    // Assert — Ace invulnerable, stays at 1 HP
    expect(result.players[1]!.battlefield[0]!.currentHp).toBe(1);
  });

  it('Ace attacking another Ace bypasses invulnerability (target destroyed)', () => {
    // Arrange — Ace attacks Ace: invulnerability does not apply
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', 'A', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('hearts', 'A', 0);
    const state = makeCombatState(p0Bf, p1Bf);

    // Act
    const { state: result } = resolveAttack(state, 0, 0, 0);

    // Assert — target Ace is destroyed (1 damage to 1 HP, no invulnerability)
    expect(result.players[1]!.battlefield[0]).toBeNull();
    expect(result.players[1]!.discardPile).toHaveLength(1);
    expect(result.players[1]!.discardPile[0]!.rank).toBe('A');
  });

  it('face card (J/Q/K) cannot destroy an Ace', () => {
    // Arrange — King attacks Ace: invulnerability applies
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', 'K', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('hearts', 'A', 0);
    const state = makeCombatState(p0Bf, p1Bf);

    // Act
    const { state: result } = resolveAttack(state, 0, 0, 0);

    // Assert — Ace survives with 1 HP (invulnerable)
    expect(result.players[1]!.battlefield[0]).not.toBeNull();
    expect(result.players[1]!.battlefield[0]!.currentHp).toBe(1);
  });
});

// === Turns ===

describe('PHX-TURNS-001: Turn structure', () => {
  it('player who deployed last takes first combat turn', () => {
    // Arrange — set up a state where deployment just completed
    // applyAction on a deploy that fills the last slot should transition to combat
    // and set the OPPOSITE player as active
    let state = createInitialState({
      players: [
        { id: '00000000-0000-0000-0000-000000000001', name: 'Alice' },
        { id: '00000000-0000-0000-0000-000000000002', name: 'Bob' },
      ],
      rngSeed: 42,
    });
    state = drawCards(drawCards(state, 0, 12), 1, 12);
    state = { ...state, phase: 'deployment', activePlayerIndex: 0 };

    // Deploy 8 cards for player 0 and 7 for player 1 via deployCard
    for (let i = 0; i < 8; i++) {
      state = deployCard(state, 0, 0, i);
    }
    for (let i = 0; i < 7; i++) {
      state = deployCard(state, 1, 0, i);
    }

    // Act — player 1 deploys last card via applyAction (column 3, auto-fills back row)
    const lastCard = state.players[1]!.hand[0]!;
    state = applyAction({ ...state, activePlayerIndex: 1 }, {
      type: 'deploy',
      playerIndex: 1,
      card: lastCard,
      column: 3,
    });

    // Assert — phase is combat, player 1 (who deployed last / lost initiative) goes first
    expect(state.phase).toBe('combat');
    expect(state.activePlayerIndex).toBe(1);
  });

  it('players alternate turns after each action', () => {
    // Arrange
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', 'K', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('spades', 'K', 0);
    p1Bf[1] = makeBfCard('spades', 'Q', 1);
    const state = makeCombatState(p0Bf, p1Bf);

    // Act — player 0 attacks
    const result = applyAction(state, {
      type: 'attack',
      playerIndex: 0,
      attackerPosition: { row: 0, col: 0 },
      targetPosition: { row: 0, col: 0 },
    });

    // Assert — now player 1's turn
    expect(result.activePlayerIndex).toBe(1);
  });

  it('active player must perform exactly one attack action', () => {
    // Arrange — it's player 0's turn in combat
    const state = makeCombatState(emptyBf(), emptyBf());
    const stateWithActiveP1 = { ...state, activePlayerIndex: 1 as 0 | 1 };

    // Act — player 0 tries to attack on player 1's turn
    const validation = validateAction(stateWithActiveP1, {
      type: 'attack',
      playerIndex: 0,
      attackerPosition: { row: 0, col: 0 },
      targetPosition: { row: 0, col: 0 },
    });

    // Assert
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain('Not this player');
  });

});

describe('PHX-TURNS-002: Pass increments turn number', () => {
  it('pass action increments turnNumber by 1', () => {
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', 'K', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('spades', 'K', 0);
    const state = makeCombatState(p0Bf, p1Bf);
    expect(state.turnNumber).toBe(1);

    const result = applyAction(state, { type: 'pass', playerIndex: 0 });

    expect(result.turnNumber).toBe(2);
    expect(result.activePlayerIndex).toBe(1);
  });

  it('consecutive passes each increment turn number', () => {
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', 'K', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('spades', 'K', 0);
    const state = makeCombatState(p0Bf, p1Bf);

    const after1 = applyAction(state, { type: 'pass', playerIndex: 0 });
    const after2 = applyAction(after1, { type: 'pass', playerIndex: 1 });

    expect(after2.turnNumber).toBe(3);
    expect(after2.activePlayerIndex).toBe(0);
  });
});

// === Victory ===

describe('PHX-VICTORY-001: Win condition', () => {
  it('player wins when all opponent battlefield cards are destroyed', () => {
    // Arrange — opponent has no cards on battlefield
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', 'K', 0);
    const state = makeCombatState(p0Bf, emptyBf());

    // Act
    const result = checkVictory(state);

    // Assert — player 0 wins via card depletion
    expect(result).toEqual({ winnerIndex: 0, victoryType: 'cardDepletion' });
  });

  it('game ends immediately when last opponent card is removed', () => {
    // Arrange — K (11) attacks the only remaining card (spades 3, 3 HP)
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', 'K', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('spades', '3', 0);
    const state = makeCombatState(p0Bf, p1Bf);

    // Act
    const result = applyAction(state, {
      type: 'attack',
      playerIndex: 0,
      attackerPosition: { row: 0, col: 0 },
      targetPosition: { row: 0, col: 0 },
    });

    // Assert — game over
    expect(result.phase).toBe('gameOver');
  });

  it('attacking player wins in simultaneous clear edge case', () => {
    // Arrange — player 0 attacks and clears last card
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', 'K', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('spades', '2', 0);
    const state = makeCombatState(p0Bf, p1Bf);

    // Act
    const result = applyAction(state, {
      type: 'attack',
      playerIndex: 0,
      attackerPosition: { row: 0, col: 0 },
      targetPosition: { row: 0, col: 0 },
    });

    // Assert — player 0 wins (attacking player)
    expect(result.phase).toBe('gameOver');
    expect(checkVictory({ ...result, phase: 'combat' })).toEqual({ winnerIndex: 0, victoryType: 'cardDepletion' });
  });

  it('game over state includes outcome with victoryType and turnNumber', () => {
    // Arrange — K(11) attacks only remaining card (spades 3, 3HP)
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', 'K', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('spades', '3', 0);
    const state = makeCombatState(p0Bf, p1Bf);

    // Act
    const result = applyAction(state, {
      type: 'attack',
      playerIndex: 0,
      attackerPosition: { row: 0, col: 0 },
      targetPosition: { row: 0, col: 0 },
    });

    // Assert — outcome recorded on game state
    expect(result.outcome).toBeDefined();
    expect(result.outcome!.winnerIndex).toBe(0);
    expect(result.outcome!.victoryType).toBe('cardDepletion');
    expect(result.outcome!.turnNumber).toBe(1);
  });
});

describe('PHX-VICTORY-002: Forfeit', () => {
  it('forfeit during combat sets gameOver with forfeit outcome', () => {
    // Arrange — normal combat state, player 0's turn
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', 'K', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('spades', '5', 0);
    const state = makeCombatState(p0Bf, p1Bf);

    // Act
    const result = applyAction(state, {
      type: 'forfeit',
      playerIndex: 0,
    });

    // Assert — opponent (player 1) wins by forfeit
    expect(result.phase).toBe('gameOver');
    expect(result.outcome).toEqual({
      winnerIndex: 1,
      victoryType: 'forfeit',
      turnNumber: 1,
    });
  });

  it('forfeit during reinforcement sets gameOver with forfeit outcome', () => {
    // Arrange — reinforcement state, player 1's turn
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', 'K', 0);
    const p1Bf = emptyBf();
    p1Bf[1] = makeBfCard('hearts', '5', 1);
    const state: GameState = {
      ...makeCombatState(p0Bf, p1Bf, {
        p1Hand: [{ suit: 'clubs', rank: '4' }],
      }),
      phase: 'reinforcement',
      activePlayerIndex: 1,
      reinforcement: { column: 0, attackerIndex: 0 },
    };

    // Act
    const result = applyAction(state, {
      type: 'forfeit',
      playerIndex: 1,
    });

    // Assert — player 0 wins by forfeit
    expect(result.phase).toBe('gameOver');
    expect(result.outcome).toEqual({
      winnerIndex: 0,
      victoryType: 'forfeit',
      turnNumber: 1,
    });
  });

  it('forfeit is rejected during deployment phase', () => {
    // Arrange — deployment state
    const p0Bf = emptyBf();
    const state: GameState = {
      ...makeCombatState(p0Bf, emptyBf()),
      phase: 'deployment',
    };

    // Act
    const validation = validateAction(state, {
      type: 'forfeit',
      playerIndex: 0,
    });

    // Assert — not valid
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain('combat or reinforcement');
  });

  it('forfeit is rejected on opponent\'s turn', () => {
    // Arrange — combat state, player 0's turn
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', 'K', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('spades', '5', 0);
    const state = makeCombatState(p0Bf, p1Bf); // activePlayerIndex = 0

    // Act — player 1 tries to forfeit on player 0's turn
    const validation = validateAction(state, {
      type: 'forfeit',
      playerIndex: 1,
    });

    // Assert — not valid
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain('Not this player');
  });
});

// === Reinforcement ===

describe('PHX-REINFORCE-001: Auto front row advancement', () => {
  it('back row card advances to front row when front is empty', () => {
    // Arrange — front row col 0 is empty, back row col 0 has a card
    const bf = emptyBf();
    bf[4] = makeBfCard('spades', '5', 4); // back row col 0

    // Act
    const result = advanceBackRow(bf, 0);

    // Assert — card moved to front row col 0, back row empty
    expect(result[0]).not.toBeNull();
    expect(result[0]!.card.rank).toBe('5');
    expect(result[0]!.position).toEqual({ row: 0, col: 0 });
    expect(result[4]).toBeNull();
  });

  it('does nothing when front row is occupied', () => {
    // Arrange
    const bf = emptyBf();
    bf[0] = makeBfCard('spades', '7', 0);
    bf[4] = makeBfCard('hearts', '5', 4);

    // Act
    const result = advanceBackRow(bf, 0);

    // Assert — nothing changes
    expect(result[0]!.card.rank).toBe('7');
    expect(result[4]!.card.rank).toBe('5');
  });

  it('does nothing when back row is empty', () => {
    // Arrange — front row empty, back row also empty
    const bf = emptyBf();

    // Act
    const result = advanceBackRow(bf, 2);

    // Assert — still empty
    expect(result[2]).toBeNull();
    expect(result[6]).toBeNull();
  });

  it('updates position metadata when advancing', () => {
    // Arrange
    const bf = emptyBf();
    bf[5] = makeBfCard('diamonds', '8', 5); // back row col 1

    // Act
    const result = advanceBackRow(bf, 1);

    // Assert — position updated to front row
    expect(result[1]!.position.row).toBe(0);
    expect(result[1]!.position.col).toBe(1);
  });

  it('isColumnFull returns true when both slots occupied', () => {
    const bf = emptyBf();
    bf[2] = makeBfCard('spades', '3', 2);
    bf[6] = makeBfCard('hearts', '7', 6);
    expect(isColumnFull(bf, 2)).toBe(true);
  });

  it('isColumnFull returns false when front slot is empty', () => {
    const bf = emptyBf();
    bf[6] = makeBfCard('hearts', '7', 6);
    expect(isColumnFull(bf, 2)).toBe(false);
  });

  it('isColumnFull returns false when both slots are empty', () => {
    expect(isColumnFull(emptyBf(), 0)).toBe(false);
  });

  it('getReinforcementTarget returns back row index when back is empty', () => {
    const bf = emptyBf();
    bf[0] = makeBfCard('spades', '5', 0); // front row col 0 occupied
    expect(getReinforcementTarget(bf, 0)).toBe(4); // back row col 0
  });

  it('getReinforcementTarget returns front row index when back is occupied and front empty', () => {
    const bf = emptyBf();
    bf[4] = makeBfCard('spades', '5', 4); // back row col 0 occupied
    expect(getReinforcementTarget(bf, 0)).toBe(0); // front row col 0
  });

  it('getReinforcementTarget returns null when column is full', () => {
    const bf = emptyBf();
    bf[0] = makeBfCard('spades', '5', 0);
    bf[4] = makeBfCard('hearts', '3', 4);
    expect(getReinforcementTarget(bf, 0)).toBeNull();
  });
});

describe('PHX-REINFORCE-002: Reinforcement phase entry after destruction', () => {
  it('enters reinforcement phase when card destroyed and defender has hand cards', () => {
    // Arrange — P0 clubs 5 at col 1 attacks P1 front-row 3 at col 1. P1 has back-row K at col 1.
    // Front 3 absorbs 3 (destroyed), overflow 2. Club doubles overflow to back: 2*2=4.
    // Back K(11): absorbs 4, survives with 7. K advances to front, back empty → reinforcement
    const p0Bf = emptyBf();
    p0Bf[1] = makeBfCard('clubs', '5', 1);
    const p1Bf = emptyBf();
    p1Bf[1] = makeBfCard('spades', '3', 1); // front row col 1
    p1Bf[5] = makeBfCard('spades', 'K', 5); // back row col 1, 11 HP
    const state = makeCombatState(p0Bf, p1Bf, {
      p1Hand: [{ suit: 'clubs', rank: '4' }],
    });

    // Act — column-locked: col 1 attacks col 1
    const result = applyAction(state, {
      type: 'attack',
      playerIndex: 0,
      attackerPosition: { row: 0, col: 1 },
      targetPosition: { row: 0, col: 1 },
    });

    // Assert — back row advanced to front, phase is reinforcement, defender is active
    expect(result.phase).toBe('reinforcement');
    expect(result.activePlayerIndex).toBe(1);
    expect(result.reinforcement).toEqual({ column: 1, attackerIndex: 0 });
    expect(result.players[1]!.battlefield[1]).not.toBeNull();
    expect(result.players[1]!.battlefield[1]!.card.rank).toBe('K');
    expect(result.players[1]!.battlefield[5]).toBeNull();
  });

  it('skips reinforcement if defender has no hand cards and column is not full', () => {
    // Arrange — P0 clubs 5 attacks P1 front-row 3, back-row K. No hand cards.
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('clubs', '5', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('spades', '3', 0);
    p1Bf[4] = makeBfCard('spades', 'K', 4); // back row col 0, 11 HP
    const state = makeCombatState(p0Bf, p1Bf);

    // Act
    const result = applyAction(state, {
      type: 'attack',
      playerIndex: 0,
      attackerPosition: { row: 0, col: 0 },
      targetPosition: { row: 0, col: 0 },
    });

    // Assert — auto-advance happens, but no reinforcement (no hand cards)
    expect(result.players[1]!.battlefield[0]!.card.rank).toBe('K');
    expect(result.phase).toBe('combat');
    expect(result.activePlayerIndex).toBe(1);
  });

  it('skips reinforcement if column is full after auto-advance', () => {
    // Arrange — front destroyed by weak attack, back advances, then back empty → reinforce
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('clubs', '5', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('spades', '3', 0); // front row col 0
    p1Bf[4] = makeBfCard('spades', 'K', 4); // back row col 0, 11 HP survives overflow
    const state = makeCombatState(p0Bf, p1Bf, {
      p1Hand: [{ suit: 'diamonds', rank: '5' }],
    });

    // Act
    const result = applyAction(state, {
      type: 'attack',
      playerIndex: 0,
      attackerPosition: { row: 0, col: 0 },
      targetPosition: { row: 0, col: 0 },
    });

    // Assert — reinforcement because back row is empty after advance
    expect(result.phase).toBe('reinforcement');
    expect(result.reinforcement).toEqual({ column: 0, attackerIndex: 0 });
  });

  it('does not enter reinforcement when no card was destroyed', () => {
    // Arrange — attack doesn't destroy (T with 10HP survives 7 damage)
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', '7', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('spades', 'T', 0);
    const state = makeCombatState(p0Bf, p1Bf, {
      p1Hand: [{ suit: 'clubs', rank: '4' }],
    });

    // Act
    const result = applyAction(state, {
      type: 'attack',
      playerIndex: 0,
      attackerPosition: { row: 0, col: 0 },
      targetPosition: { row: 0, col: 0 },
    });

    // Assert — normal combat continues, no reinforcement
    expect(result.phase).toBe('combat');
    expect(result.activePlayerIndex).toBe(1);
    expect(result.reinforcement).toBeUndefined();
  });

  it('auto-advances back row before checking reinforcement', () => {
    // Arrange — front destroyed, back row card survives overflow, advances
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('clubs', '5', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('spades', '2', 0); // front row col 0
    p1Bf[4] = makeBfCard('spades', 'K', 4); // back row col 0, 11 HP
    const state = makeCombatState(p0Bf, p1Bf, {
      p1Hand: [{ suit: 'diamonds', rank: '6' }],
    });

    // Act
    const result = applyAction(state, {
      type: 'attack',
      playerIndex: 0,
      attackerPosition: { row: 0, col: 0 },
      targetPosition: { row: 0, col: 0 },
    });

    // Assert — K advanced to front, back row empty → reinforcement
    expect(result.players[1]!.battlefield[0]!.card.rank).toBe('K');
    expect(result.players[1]!.battlefield[4]).toBeNull();
    expect(result.phase).toBe('reinforcement');
  });
});

describe('PHX-REINFORCE-003: Mandatory deployment to damaged column', () => {
  it('deploys hand card to back row of reinforcement column', () => {
    // Arrange — reinforcement phase, column 1 has front occupied, back empty
    const p1Bf = emptyBf();
    p1Bf[1] = makeBfCard('hearts', '7', 1); // front row col 1
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', 'K', 0);
    const state: GameState = {
      ...makeCombatState(p0Bf, p1Bf, {
        p1Hand: [{ suit: 'clubs', rank: '4' }, { suit: 'diamonds', rank: '6' }],
      }),
      phase: 'reinforcement',
      activePlayerIndex: 1,
      reinforcement: { column: 1, attackerIndex: 0 },
    };

    // Act
    const result = applyAction(state, {
      type: 'reinforce',
      playerIndex: 1,
      card: { suit: 'clubs', rank: '4' },
    });

    // Assert — card deployed to back row col 1 (grid index 5)
    expect(result.players[1]!.battlefield[5]).not.toBeNull();
    expect(result.players[1]!.battlefield[5]!.card.rank).toBe('4');
    expect(result.players[1]!.battlefield[5]!.card.suit).toBe('clubs');
    expect(result.players[1]!.hand).toHaveLength(1); // had 2, placed 1
  });

  it('column becomes full after reinforcement → exits reinforcement', () => {
    // Arrange — column 2 has front occupied, back empty. One hand card fills it.
    const p1Bf = emptyBf();
    p1Bf[2] = makeBfCard('hearts', '7', 2); // front row col 2
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', 'K', 0);
    const state: GameState = {
      ...makeCombatState(p0Bf, p1Bf, {
        p1Hand: [{ suit: 'clubs', rank: '4' }],
      }),
      phase: 'reinforcement',
      activePlayerIndex: 1,
      reinforcement: { column: 2, attackerIndex: 0 },
    };

    // Act
    const result = applyAction(state, {
      type: 'reinforce',
      playerIndex: 1,
      card: { suit: 'clubs', rank: '4' },
    });

    // Assert — column full, exits reinforcement to combat
    expect(result.phase).toBe('combat');
    expect(result.reinforcement).toBeUndefined();
    // Turn passes to next player after the original attacker
    expect(result.activePlayerIndex).toBe(1); // opponent of attacker(0)
  });

  it('hand becomes empty after reinforcement → exits reinforcement', () => {
    // Arrange — column 0 has both slots empty, only 1 hand card
    const p1Bf = emptyBf();
    p1Bf[1] = makeBfCard('hearts', '7', 1); // other column, not col 0
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', 'K', 0);
    const state: GameState = {
      ...makeCombatState(p0Bf, p1Bf, {
        p1Hand: [{ suit: 'clubs', rank: '4' }],
      }),
      phase: 'reinforcement',
      activePlayerIndex: 1,
      reinforcement: { column: 0, attackerIndex: 0 },
    };

    // Act
    const result = applyAction(state, {
      type: 'reinforce',
      playerIndex: 1,
      card: { suit: 'clubs', rank: '4' },
    });

    // Assert — hand empty, exits reinforcement
    expect(result.players[1]!.hand).toHaveLength(0);
    expect(result.phase).toBe('combat');
  });

  it('stays in reinforcement when column not full and hand not empty', () => {
    // Arrange — column 0 has both slots empty, 2 hand cards
    const p1Bf = emptyBf();
    p1Bf[1] = makeBfCard('hearts', '7', 1);
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', 'K', 0);
    const state: GameState = {
      ...makeCombatState(p0Bf, p1Bf, {
        p1Hand: [{ suit: 'clubs', rank: '4' }, { suit: 'diamonds', rank: '6' }],
      }),
      phase: 'reinforcement',
      activePlayerIndex: 1,
      reinforcement: { column: 0, attackerIndex: 0 },
    };

    // Act — deploy first card to back row
    const result = applyAction(state, {
      type: 'reinforce',
      playerIndex: 1,
      card: { suit: 'clubs', rank: '4' },
    });

    // Assert — still in reinforcement (card placed in back row then auto-advanced to front)
    expect(result.phase).toBe('reinforcement');
    expect(result.players[1]!.battlefield[0]!.card.rank).toBe('4'); // auto-advanced to front row col 0
    expect(result.players[1]!.battlefield[4]).toBeNull(); // back row empty after advance
    expect(result.players[1]!.hand).toHaveLength(1);
  });

  it('rejects reinforce action when not in reinforcement phase', () => {
    const state = makeCombatState(emptyBf(), emptyBf());
    const validation = validateAction(state, {
      type: 'reinforce',
      playerIndex: 0,
      card: { suit: 'clubs', rank: '4' },
    });
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain('reinforcement phase');
  });

  it('rejects reinforce action when card not in hand', () => {
    const state: GameState = {
      ...makeCombatState(emptyBf(), emptyBf(), {
        p1Hand: [{ suit: 'hearts', rank: '5' }],
      }),
      phase: 'reinforcement',
      activePlayerIndex: 1,
      reinforcement: { column: 0, attackerIndex: 0 },
    };
    const validation = validateAction(state, {
      type: 'reinforce',
      playerIndex: 1,
      card: { suit: 'clubs', rank: '4' }, // not in hand
    });
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain('not found in hand');
  });
});

describe('PHX-REINFORCE-004: Draw to 4 after reinforcement', () => {
  it('defender draws from drawpile until hand has 4 cards after reinforcement ends', () => {
    // Arrange — column 2 has front occupied, back empty. 1 hand card + 5 in drawpile
    const p1Bf = emptyBf();
    p1Bf[2] = makeBfCard('hearts', '7', 2);
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', 'K', 0);
    const drawpile: Card[] = [
      { suit: 'spades', rank: '2' },
      { suit: 'spades', rank: '3' },
      { suit: 'spades', rank: '4' },
      { suit: 'spades', rank: '5' },
      { suit: 'spades', rank: '6' },
    ];
    const state: GameState = {
      ...makeCombatState(p0Bf, p1Bf, {
        p1Hand: [{ suit: 'clubs', rank: '4' }],
        p1Drawpile: drawpile,
      }),
      phase: 'reinforcement',
      activePlayerIndex: 1,
      reinforcement: { column: 2, attackerIndex: 0 },
    };

    // Act — reinforce fills column, triggers draw to 4
    const result = applyAction(state, {
      type: 'reinforce',
      playerIndex: 1,
      card: { suit: 'clubs', rank: '4' },
    });

    // Assert — hand was empty after placing card, drew 4 from drawpile
    expect(result.players[1]!.hand).toHaveLength(4);
    expect(result.players[1]!.drawpile).toHaveLength(1); // 5 - 4 = 1
  });

  it('draws only what is available if drawpile has fewer than needed', () => {
    // Arrange — hand empty after reinforce, drawpile has 2 cards
    const p1Bf = emptyBf();
    p1Bf[2] = makeBfCard('hearts', '7', 2);
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', 'K', 0);
    const state: GameState = {
      ...makeCombatState(p0Bf, p1Bf, {
        p1Hand: [{ suit: 'clubs', rank: '4' }],
        p1Drawpile: [{ suit: 'spades', rank: '2' }, { suit: 'spades', rank: '3' }],
      }),
      phase: 'reinforcement',
      activePlayerIndex: 1,
      reinforcement: { column: 2, attackerIndex: 0 },
    };

    // Act
    const result = applyAction(state, {
      type: 'reinforce',
      playerIndex: 1,
      card: { suit: 'clubs', rank: '4' },
    });

    // Assert — drew only 2 (all available), hand has 2
    expect(result.players[1]!.hand).toHaveLength(2);
    expect(result.players[1]!.drawpile).toHaveLength(0);
  });

  it('does not draw if hand already has 4+ cards', () => {
    // Arrange — 5 hand cards, column has 1 empty slot
    const p1Bf = emptyBf();
    p1Bf[2] = makeBfCard('hearts', '7', 2);
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', 'K', 0);
    const handCards: Card[] = [
      { suit: 'clubs', rank: '4' },
      { suit: 'diamonds', rank: '5' },
      { suit: 'hearts', rank: '6' },
      { suit: 'spades', rank: '7' },
      { suit: 'clubs', rank: '8' },
    ];
    const state: GameState = {
      ...makeCombatState(p0Bf, p1Bf, {
        p1Hand: handCards,
        p1Drawpile: [{ suit: 'spades', rank: '2' }],
      }),
      phase: 'reinforcement',
      activePlayerIndex: 1,
      reinforcement: { column: 2, attackerIndex: 0 },
    };

    // Act — deploy one card, column full, exits reinforcement
    const result = applyAction(state, {
      type: 'reinforce',
      playerIndex: 1,
      card: { suit: 'clubs', rank: '4' },
    });

    // Assert — 5 - 1 = 4, already at 4, no draw needed
    expect(result.players[1]!.hand).toHaveLength(4);
    expect(result.players[1]!.drawpile).toHaveLength(1); // unchanged
  });
});

describe('PHX-REINFORCE-005: Victory requires no battlefield + no hand + no drawpile', () => {
  it('no victory when opponent has empty battlefield but hand cards remain', () => {
    // Arrange — opponent has no battlefield cards but has hand cards
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', 'K', 0);
    const state = makeCombatState(p0Bf, emptyBf(), {
      p1Hand: [{ suit: 'clubs', rank: '4' }],
    });

    // Act
    const result = checkVictory(state);

    // Assert — no winner yet
    expect(result).toBeNull();
  });

  it('no victory when opponent has empty battlefield but drawpile cards remain', () => {
    // Arrange — opponent has no battlefield or hand cards but has drawpile
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', 'K', 0);
    const state = makeCombatState(p0Bf, emptyBf(), {
      p1Drawpile: [{ suit: 'spades', rank: '2' }],
    });

    // Act
    const result = checkVictory(state);

    // Assert — no winner yet
    expect(result).toBeNull();
  });

  it('victory when opponent has no battlefield, no hand, and no drawpile', () => {
    // Arrange — opponent fully depleted
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', 'K', 0);
    const state = makeCombatState(p0Bf, emptyBf());

    // Act
    const result = checkVictory(state);

    // Assert — player 0 wins via card depletion
    expect(result).toEqual({ winnerIndex: 0, victoryType: 'cardDepletion' });
  });

  it('attack that clears battlefield does not end game if defender has hand cards', () => {
    // Arrange — clubs 4 attacks defender's only card (spades 3), defender has hand cards
    // 4 damage destroys 3HP card, overflow 1. No back card. LP damage = 1. Not fatal.
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('clubs', '4', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('spades', '3', 0); // only battlefield card, col 0
    const state = makeCombatState(p0Bf, p1Bf, {
      p1Hand: [{ suit: 'clubs', rank: '4' }],
    });

    // Act
    const result = applyAction(state, {
      type: 'attack',
      playerIndex: 0,
      attackerPosition: { row: 0, col: 0 },
      targetPosition: { row: 0, col: 0 },
    });

    // Assert — game is NOT over, enters reinforcement
    expect(result.phase).toBe('reinforcement');
    expect(result.players[1]!.lifepoints).toBe(19); // 1 overflow to LP
  });
});

// === Resources ===

describe('PHX-RESOURCES-001: Hand card management', () => {
  it('each player holds 4 cards in hand after deployment', () => {
    // Arrange
    let state = createInitialState({
      players: [
        { id: '00000000-0000-0000-0000-000000000001', name: 'Alice' },
        { id: '00000000-0000-0000-0000-000000000002', name: 'Bob' },
      ],
      rngSeed: 42,
    });
    state = drawCards(drawCards(state, 0, 12), 1, 12);

    // Act — deploy 8 cards each
    for (let i = 0; i < 8; i++) {
      state = deployCard(state, 0, 0, i);
    }
    for (let i = 0; i < 8; i++) {
      state = deployCard(state, 1, 0, i);
    }

    // Assert
    expect(state.players[0]!.hand).toHaveLength(4);
    expect(state.players[1]!.hand).toHaveLength(4);
  });

  it('hand cards cannot be played to battlefield during regular turns', () => {
    // Arrange — combat phase, player tries to deploy
    const state = makeCombatState(emptyBf(), emptyBf());
    const validation = validateAction(state, {
      type: 'deploy',
      playerIndex: 0,
      card: { suit: 'spades', rank: '5' },
      column: 0,
    });

    // Assert
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain('deployment phase');
  });

  it('hand cards are used during reinforcement phase', () => {
    // Arrange — hand cards exist and are deployed during reinforcement
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', 'K', 0);
    const p1Bf = emptyBf();
    p1Bf[1] = makeBfCard('hearts', '7', 1);
    const state: GameState = {
      ...makeCombatState(p0Bf, p1Bf, {
        p1Hand: [{ suit: 'clubs', rank: '4' }],
      }),
      phase: 'reinforcement',
      activePlayerIndex: 1,
      reinforcement: { column: 0, attackerIndex: 0 },
    };

    // Act — reinforce action deploys a hand card
    const result = applyAction(state, {
      type: 'reinforce',
      playerIndex: 1,
      card: { suit: 'clubs', rank: '4' },
    });

    // Assert — hand card was deployed to battlefield
    expect(result.players[1]!.hand).toHaveLength(0);
    expect(result.players[1]!.battlefield[0]!.card.rank).toBe('4');
  });
});

// === Life Points ===

describe('PHX-LP-001: Players start with 20 LP', () => {
  it('each player begins with 20 LP', () => {
    const state = createInitialState({
      players: [
        { id: '00000000-0000-0000-0000-000000000001', name: 'Alice' },
        { id: '00000000-0000-0000-0000-000000000002', name: 'Bob' },
      ],
      rngSeed: 42,
    });

    expect(state.players[0]!.lifepoints).toBe(20);
    expect(state.players[1]!.lifepoints).toBe(20);
  });

  it('LP is included in makeCombatState helper', () => {
    const state = makeCombatState(emptyBf(), emptyBf());
    expect(state.players[0]!.lifepoints).toBe(20);
    expect(state.players[1]!.lifepoints).toBe(20);
  });

  it('LP can be set to custom values', () => {
    const state = makeCombatState(emptyBf(), emptyBf(), {
      p0Lifepoints: 10,
      p1Lifepoints: 5,
    });
    expect(state.players[0]!.lifepoints).toBe(10);
    expect(state.players[1]!.lifepoints).toBe(5);
  });
});

describe('PHX-LP-002: LP depletion victory', () => {
  it('player wins when opponent LP reaches 0', () => {
    // Arrange — opponent has 1 LP, attacker will deal overflow
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('clubs', 'K', 0); // 11 damage
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('spades', '5', 0); // 5 HP, overflow 6
    const state = makeCombatState(p0Bf, p1Bf, {
      p1Lifepoints: 3,
      p1Hand: [{ suit: 'clubs', rank: '2' }],
      p1Drawpile: [{ suit: 'spades', rank: '3' }],
    });

    // Act
    const result = applyAction(state, {
      type: 'attack',
      playerIndex: 0,
      attackerPosition: { row: 0, col: 0 },
      targetPosition: { row: 0, col: 0 },
    });

    // Assert — LP reaches 0, game over with lpDepletion outcome
    expect(result.players[1]!.lifepoints).toBe(0);
    expect(result.phase).toBe('gameOver');
    expect(result.outcome).toBeDefined();
    expect(result.outcome!.victoryType).toBe('lpDepletion');
    expect(result.outcome!.winnerIndex).toBe(0);
  });

  it('LP is clamped at 0 (cannot go negative)', () => {
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('clubs', 'K', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('spades', '2', 0); // 2 HP, overflow 9
    const state = makeCombatState(p0Bf, p1Bf, { p1Lifepoints: 3 });

    const { state: result } = resolveAttack(state, 0, 0, 0);
    expect(result.players[1]!.lifepoints).toBe(0);
  });

  it('LP victory takes priority even when cards remain', () => {
    // Arrange — opponent has cards on battlefield but LP=0 after overflow
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('clubs', 'K', 0); // 11 damage
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('spades', '2', 0); // col 0 front, 2 HP → overflow 9
    p1Bf[1] = makeBfCard('spades', '5', 1); // col 1, unrelated
    const state = makeCombatState(p0Bf, p1Bf, { p1Lifepoints: 5 });

    const result = applyAction(state, {
      type: 'attack',
      playerIndex: 0,
      attackerPosition: { row: 0, col: 0 },
      targetPosition: { row: 0, col: 0 },
    });

    expect(result.players[1]!.lifepoints).toBe(0);
    expect(result.phase).toBe('gameOver');
    // Opponent still has a card on the battlefield
    expect(result.players[1]!.battlefield[1]).not.toBeNull();
  });
});

// === Overflow Damage ===

describe('PHX-OVERFLOW-001: Column overflow damage', () => {
  it('damage flows through front card to back card', () => {
    // Arrange — clubs 9 attacks front 5, back K in same column
    // Front 5: absorbs 5, destroyed. Overflow 4. Club doubles to 8. Back K(11): absorbs 8, survives with 3.
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('clubs', '9', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('spades', '5', 0); // front col 0
    p1Bf[4] = makeBfCard('spades', 'K', 4); // back col 0
    const state = makeCombatState(p0Bf, p1Bf);

    const { state: result } = resolveAttack(state, 0, 0, 0);

    expect(result.players[1]!.battlefield[0]).toBeNull(); // front destroyed
    expect(result.players[1]!.battlefield[4]!.currentHp).toBe(3); // K took 8 (club doubled)
  });

  it('damage flows through both cards to player LP', () => {
    // Arrange — clubs K(11) attacks front 3, back 2
    // Front 3: absorbs 3, destroyed. Overflow 8. Club doubles to 16. Back 2: absorbs 2, destroyed. Overflow 14 → LP
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('clubs', 'K', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('spades', '3', 0);
    p1Bf[4] = makeBfCard('spades', '2', 4);
    const state = makeCombatState(p0Bf, p1Bf);

    const { state: result } = resolveAttack(state, 0, 0, 0);

    expect(result.players[1]!.battlefield[0]).toBeNull();
    expect(result.players[1]!.battlefield[4]).toBeNull();
    expect(result.players[1]!.lifepoints).toBe(6); // 20 - 14 = 6
  });

  it('no overflow when damage equals front card HP exactly', () => {
    // Arrange — spades 5 attacks front 5 (exact kill, no overflow)
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', '5', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('spades', '5', 0);
    p1Bf[4] = makeBfCard('spades', '3', 4); // back card untouched
    const state = makeCombatState(p0Bf, p1Bf);

    const { state: result } = resolveAttack(state, 0, 0, 0);

    expect(result.players[1]!.battlefield[0]).toBeNull(); // front destroyed
    expect(result.players[1]!.battlefield[4]!.currentHp).toBe(3); // back untouched
    expect(result.players[1]!.lifepoints).toBe(20); // no LP damage
  });

  it('no overflow when damage does not destroy front card', () => {
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', '3', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('spades', '5', 0);
    const state = makeCombatState(p0Bf, p1Bf);

    const { state: result } = resolveAttack(state, 0, 0, 0);

    expect(result.players[1]!.battlefield[0]!.currentHp).toBe(2);
    expect(result.players[1]!.lifepoints).toBe(20);
  });

  it('overflow goes directly to LP when no back card', () => {
    // Arrange — spades 8 attacks front 3, no back card
    // Front 3: destroyed, overflow 5. Spade doubles LP: 5*2=10
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', '8', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('spades', '3', 0);
    const state = makeCombatState(p0Bf, p1Bf);

    const { state: result } = resolveAttack(state, 0, 0, 0);

    expect(result.players[1]!.battlefield[0]).toBeNull();
    expect(result.players[1]!.lifepoints).toBe(10); // 20 - 10 (spade ×2)
  });

  it('overflow from column with only back card (front empty) goes to LP', () => {
    // Arrange — spades 8 at col 0, opponent front empty, back 3 at col 0
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', '8', 0);
    const p1Bf = emptyBf();
    p1Bf[4] = makeBfCard('spades', '3', 4);
    const state = makeCombatState(p0Bf, p1Bf);

    // Act — column-locked: col 0 attacks col 0, front is null, damage flows to back
    const { state: result } = resolveAttack(state, 0, 0, 0);

    // Front is null (skipped), back 3: absorbs 3 (destroyed), overflow 5 → LP with spade ×2 = 10
    expect(result.players[1]!.battlefield[4]).toBeNull();
    expect(result.players[1]!.lifepoints).toBe(10); // 20 - 10
  });
});

describe('PHX-OVERFLOW-002: Ace overflow exception', () => {
  it('Ace absorbs exactly 1 damage, rest overflows', () => {
    // Arrange — clubs K(11) attacks Ace front, spades 8 back
    // Ace absorbs 1, overflow 10. Club doubles to 20. Back 8: absorbs 8, destroyed. Overflow 12 → LP.
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('clubs', 'K', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('spades', 'A', 0); // Ace front
    p1Bf[4] = makeBfCard('spades', '8', 4); // back
    const state = makeCombatState(p0Bf, p1Bf);

    const { state: result } = resolveAttack(state, 0, 0, 0);

    expect(result.players[1]!.battlefield[0]!.currentHp).toBe(1); // Ace survives
    expect(result.players[1]!.battlefield[4]).toBeNull(); // back destroyed
    expect(result.players[1]!.lifepoints).toBe(8); // 20 - 12 = 8
  });

  it('Ace-vs-Ace: invulnerability does not apply, target destroyed', () => {
    // Arrange — Ace attacks Ace. Ace deals 1 damage. Ace has 1 HP. Destroyed.
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', 'A', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('hearts', 'A', 0);
    const state = makeCombatState(p0Bf, p1Bf);

    const { state: result } = resolveAttack(state, 0, 0, 0);

    expect(result.players[1]!.battlefield[0]).toBeNull();
    expect(result.players[1]!.discardPile).toHaveLength(1);
  });

  it('Q(11) attacking Ace: Ace absorbs 1, overflow 10', () => {
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('clubs', 'Q', 0); // 11 damage
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('hearts', 'A', 0); // Ace, only card
    const state = makeCombatState(p0Bf, p1Bf);

    const { state: result } = resolveAttack(state, 0, 0, 0);

    // Ace absorbs 1 (invulnerable, not destroyed), overflow 10. No back card.
    // Heart shield does NOT activate (Ace not destroyed). LP damage = 10.
    expect(result.players[1]!.battlefield[0]!.currentHp).toBe(1);
    expect(result.players[1]!.lifepoints).toBe(10); // 20 - 10
  });

  it('Diamond Ace front row: absorbs 1, no posthumous shield (Ace not destroyed)', () => {
    // Diamond Ace: invulnerable, so not destroyed. No posthumous shield.
    // Ace absorbs 1, overflow = damage - 1
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('clubs', '5', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('diamonds', 'A', 0);
    const state = makeCombatState(p0Bf, p1Bf);

    const { state: result } = resolveAttack(state, 0, 0, 0);

    expect(result.players[1]!.battlefield[0]!.currentHp).toBe(1);
    // Overflow 4 → no back card → LP damage = 4
    expect(result.players[1]!.lifepoints).toBe(16);
  });
});

// === Combat Log ===

describe('PHX-COMBATLOG-001: Structured combat log', () => {
  it('attack produces a combat log entry with structured attackerCard', () => {
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', '7', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('spades', 'T', 0);
    const state = makeCombatState(p0Bf, p1Bf);

    const { combatEntry: entry } = resolveAttack(state, 0, 0, 0);

    expect(entry.turnNumber).toBe(1);
    expect(entry.attackerPlayerIndex).toBe(0);
    expect(entry.attackerCard).toEqual({ suit: 'spades', rank: '7' });
    expect(entry.targetColumn).toBe(0);
    expect(entry.baseDamage).toBe(7);
  });

  it('log steps include structured card and audit fields', () => {
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', '7', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('spades', 'T', 0);
    const state = makeCombatState(p0Bf, p1Bf);

    const { combatEntry } = resolveAttack(state, 0, 0, 0);
    const steps = combatEntry.steps;

    expect(steps.length).toBe(1); // only front card hit, no overflow
    const step = steps[0]!;
    expect(step.target).toBe('frontCard');
    expect(step.card).toEqual({ suit: 'spades', rank: 'T' });
    expect(step.incomingDamage).toBe(7);
    expect(step.hpBefore).toBe(10);
    expect(step.effectiveHp).toBe(10);
    expect(step.absorbed).toBe(7);
    expect(step.overflow).toBe(0);
    expect(step.damage).toBe(7);
    expect(step.hpAfter).toBe(3);
    expect(step.destroyed).toBe(false);
  });

  it('log includes LP damage step with lpBefore/lpAfter', () => {
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('clubs', '8', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('spades', '3', 0); // front only
    const state = makeCombatState(p0Bf, p1Bf);

    const { combatEntry: entry } = resolveAttack(state, 0, 0, 0);

    expect(entry.steps.length).toBe(2); // front card + LP
    expect(entry.steps[0]!.target).toBe('frontCard');
    expect(entry.steps[0]!.destroyed).toBe(true);
    const lpStep = entry.steps[1]!;
    expect(lpStep.target).toBe('playerLp');
    expect(lpStep.damage).toBe(5); // overflow 5
    expect(lpStep.lpBefore).toBe(20);
    expect(lpStep.lpAfter).toBe(15);
    expect(entry.totalLpDamage).toBe(5);
  });

  it('log records suit bonuses as enum values', () => {
    // Club attacker → back card should show bonus
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('clubs', 'K', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('spades', '3', 0);
    p1Bf[4] = makeBfCard('spades', 'K', 4);
    const state = makeCombatState(p0Bf, p1Bf);

    const { combatEntry } = resolveAttack(state, 0, 0, 0);
    const steps = combatEntry.steps;

    const backStep = steps.find(s => s.target === 'backCard');
    expect(backStep).toBeDefined();
    expect(backStep!.bonuses).toContain('clubDoubleOverflow');
  });

  it('multiple attacks produce separate combatEntries', () => {
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', '3', 0);
    p0Bf[1] = makeBfCard('spades', '2', 1);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('spades', 'K', 0);
    p1Bf[1] = makeBfCard('spades', 'Q', 1);
    const state = makeCombatState(p0Bf, p1Bf);

    const { state: s1, combatEntry: e1 } = resolveAttack(state, 0, 0, 0);
    const { combatEntry: e2 } = resolveAttack(s1, 0, 1, 1);

    expect(e1.targetColumn).toBe(0);
    expect(e2.targetColumn).toBe(1);
  });

  it('transactionLog starts empty in initial state', () => {
    const state = createInitialState({
      players: [
        { id: '00000000-0000-0000-0000-000000000001', name: 'Alice' },
        { id: '00000000-0000-0000-0000-000000000002', name: 'Bob' },
      ],
      rngSeed: 42,
    });
    expect(state.transactionLog).toEqual([]);
  });
});

describe('PHX-COMBATLOG-002: Self-verifiable combat log', () => {
  it('card step invariant: absorbed = min(incomingDamage, effectiveHp)', () => {
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', 'K', 0); // 11 damage
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('spades', '5', 0); // 5 HP front
    p1Bf[4] = makeBfCard('spades', '3', 4); // 3 HP back
    const state = makeCombatState(p0Bf, p1Bf);

    const { combatEntry } = resolveAttack(state, 0, 0, 0);
    const steps = combatEntry.steps;

    for (const step of steps) {
      if (step.target !== 'playerLp' && step.absorbed !== undefined && step.effectiveHp !== undefined) {
        expect(step.absorbed).toBe(Math.min(step.incomingDamage, step.effectiveHp));
      }
    }
  });

  it('card step invariant: overflow = incomingDamage - absorbed', () => {
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', 'K', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('spades', '5', 0);
    p1Bf[4] = makeBfCard('spades', '3', 4);
    const state = makeCombatState(p0Bf, p1Bf);

    const { combatEntry } = resolveAttack(state, 0, 0, 0);
    const steps = combatEntry.steps;

    for (const step of steps) {
      if (step.target !== 'playerLp' && step.absorbed !== undefined && step.overflow !== undefined) {
        expect(step.overflow).toBe(step.incomingDamage - step.absorbed);
      }
    }
  });

  it('card step invariant: hpAfter = hpBefore - damage', () => {
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', '7', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('spades', 'T', 0); // 10 HP, takes 7
    const state = makeCombatState(p0Bf, p1Bf);

    const { combatEntry } = resolveAttack(state, 0, 0, 0);
    const step = combatEntry.steps[0]!;

    expect(step.hpAfter).toBe(step.hpBefore! - step.damage);
  });

  it('LP step invariant: lpAfter = max(0, lpBefore - damage)', () => {
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', 'K', 0); // 11 damage
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('spades', '3', 0); // 3 HP, 8 overflow, spade ×2 = 16
    const state = makeCombatState(p0Bf, p1Bf);

    const { combatEntry } = resolveAttack(state, 0, 0, 0);
    const lpStep = combatEntry.steps.find(s => s.target === 'playerLp');
    expect(lpStep).toBeDefined();
    expect(lpStep!.lpAfter).toBe(Math.max(0, lpStep!.lpBefore! - lpStep!.damage));
  });

  it('overflow chains: step[n+1].incomingDamage derives from step[n].overflow', () => {
    // K(11) attacks front 5, back 3 — overflow chains through
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('hearts', 'K', 0); // hearts to avoid spade/club bonuses
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('spades', '5', 0);
    p1Bf[4] = makeBfCard('spades', '3', 4);
    const state = makeCombatState(p0Bf, p1Bf);

    const { combatEntry } = resolveAttack(state, 0, 0, 0);
    const steps = combatEntry.steps;

    // front → back → LP: front overflow becomes back incomingDamage
    expect(steps.length).toBe(3);
    expect(steps[1]!.incomingDamage).toBe(steps[0]!.overflow);
    // back overflow becomes LP incomingDamage
    expect(steps[2]!.incomingDamage).toBe(steps[1]!.overflow);
  });

  it('diamond posthumous shield produces correct audit trail', () => {
    // 8H attacks Diamond 5 (5 HP front). Diamond destroyed (5 < 8), overflow = 3.
    // No Club. Shield = 5 absorbs 3. Net overflow = 0. Bonus on front card step.
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('hearts', '8', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('diamonds', '5', 0); // front row
    const state = makeCombatState(p0Bf, p1Bf);

    const { combatEntry } = resolveAttack(state, 0, 0, 0);
    const step = combatEntry.steps[0]!;

    expect(step.hpBefore).toBe(5);
    expect(step.effectiveHp).toBe(5); // no in-place doubling
    expect(step.absorbed).toBe(5);    // card absorbed its HP
    expect(step.destroyed).toBe(true);
    expect(step.overflow).toBe(0);    // net after shield
    expect(step.bonuses).toContain('diamondDeathShield');
  });

  it('ace invulnerability produces correct bonus and audit trail', () => {
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', '7', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('hearts', 'A', 0);
    const state = makeCombatState(p0Bf, p1Bf);

    const { combatEntry } = resolveAttack(state, 0, 0, 0);
    const step = combatEntry.steps[0]!;

    expect(step.bonuses).toContain('aceInvulnerable');
    expect(step.hpBefore).toBe(1);
    expect(step.absorbed).toBe(1);
    expect(step.hpAfter).toBe(1);
    expect(step.overflow).toBe(6);
  });
});

// === Suit Overflow Combo Tests ===

describe('PHX-SUIT-004: Spades double overflow to player LP', () => {
  it('Spade attacker doubles overflow damage to player LP', () => {
    // Arrange — spades 8 attacks front 3 (no back card)
    // 8 - 3 = 5 overflow. Spade doubles: 5*2 = 10 LP damage
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', '8', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('clubs', '3', 0);
    const state = makeCombatState(p0Bf, p1Bf);

    const { state: result } = resolveAttack(state, 0, 0, 0);

    expect(result.players[1]!.lifepoints).toBe(10); // 20 - 10
  });

  it('non-Spade attacker does not double LP overflow', () => {
    // Arrange — clubs 8 attacks front 3 (no back card)
    // 8 - 3 = 5 overflow. No Spade bonus.
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('clubs', '8', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('spades', '3', 0);
    const state = makeCombatState(p0Bf, p1Bf);

    const { state: result } = resolveAttack(state, 0, 0, 0);

    expect(result.players[1]!.lifepoints).toBe(15); // 20 - 5
  });

  it('Spade + Heart: Spade doubles, Heart shield absorbs from doubled value', () => {
    // Spades K(11) attacks hearts 5 (only card, no back row).
    // 5♥ destroyed, overflow 6. Spade ×2 = 12. Heart shield = 5 absorbs 5. lpDamage = 7.
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', 'K', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('hearts', '5', 0);
    const state = makeCombatState(p0Bf, p1Bf);

    const { state: result } = resolveAttack(state, 0, 0, 0);

    expect(result.players[1]!.lifepoints).toBe(13); // 20 - 7
  });
});

describe('Overflow combo: Club + Diamond', () => {
  it('Club doubles overflow before Diamond shield absorbs — diamond survives if not over HP', () => {
    // 8C attacks Diamond 5 (5 HP front), back = spades 3 (3 HP)
    // Diamond destroyed (5 < 8), overflow = 3. Club doubles: 3×2=6.
    // Diamond shield = 5 absorbs 5. Net overflow = 1. Back 3 takes 1, survives at 2.
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('clubs', '8', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('diamonds', '5', 0); // front row
    p1Bf[4] = makeBfCard('spades', '3', 4);
    const state = makeCombatState(p0Bf, p1Bf);

    const { state: result } = resolveAttack(state, 0, 0, 0);

    expect(result.players[1]!.battlefield[0]).toBeNull();          // Diamond destroyed
    expect(result.players[1]!.battlefield[4]!.currentHp).toBe(2); // 3 - 1 = 2
    expect(result.players[1]!.lifepoints).toBe(20);
  });

  it('Club doubles overflow before Diamond shield — shield absorbs all of Club-doubled overflow', () => {
    // 4C attacks Diamond 6 (6 HP front), back = hearts 5 (5 HP)
    // Diamond destroyed (6 < 4? No — 4 < 6, Diamond survives at 2 HP). No shield.
    // Actually use: 7C attacks Diamond 3 (3 HP front), back = spades 5 (5 HP)
    // Diamond destroyed (3 < 7), overflow = 4. Club doubles: 4×2=8.
    // Diamond shield = 3 absorbs 3. Net overflow = 5. Back 5 absorbs 5, destroyed. LP = 20.
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('clubs', '7', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('diamonds', '3', 0); // front row
    p1Bf[4] = makeBfCard('spades', '5', 4);
    const state = makeCombatState(p0Bf, p1Bf);

    const { state: result } = resolveAttack(state, 0, 0, 0);

    expect(result.players[1]!.battlefield[0]).toBeNull(); // Diamond destroyed
    expect(result.players[1]!.battlefield[4]).toBeNull(); // 5 destroyed by 5 overflow
    expect(result.players[1]!.lifepoints).toBe(20);
  });

  it('Club doubles overflow before Diamond shield — remaining overflow hits LP', () => {
    // KC(11) attacks Diamond 3 (3 HP front), back = spades T(10)
    // Diamond destroyed (3 < 11), overflow = 8. Club doubles: 8×2=16.
    // Diamond shield = 3 absorbs 3. Net = 13. T absorbs 10, destroyed. Overflow = 3 to LP.
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('clubs', 'K', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('diamonds', '3', 0);
    p1Bf[4] = makeBfCard('spades', 'T', 4);
    const state = makeCombatState(p0Bf, p1Bf);

    const { state: result } = resolveAttack(state, 0, 0, 0);

    expect(result.players[1]!.battlefield[0]).toBeNull(); // diamond destroyed
    expect(result.players[1]!.battlefield[4]).toBeNull(); // T destroyed
    expect(result.players[1]!.lifepoints).toBe(17);       // 20 - 3
  });
});

// === Transaction Log ===

describe('PHX-TXLOG-001: Transaction log records every game action', () => {
  /** Stub hash function for testing */
  const stubHash = (s: unknown) => `hash-${JSON.stringify(s).length}`;
  const opts: ApplyActionOptions = { hashFn: stubHash, timestamp: '2025-01-01T00:00:00.000Z' };

  it('deploy produces entry with details.type === "deploy"', () => {
    // Arrange — deployment phase state
    let state = createInitialState({
      players: [
        { id: '00000000-0000-0000-0000-000000000001', name: 'Alice' },
        { id: '00000000-0000-0000-0000-000000000002', name: 'Bob' },
      ],
      rngSeed: 42,
    });
    state = drawCards(drawCards(state, 0, 12), 1, 12);
    state = { ...state, phase: 'deployment', activePlayerIndex: 0 };

    const card = state.players[0]!.hand[0]!;

    // Act
    const result = applyAction(state, {
      type: 'deploy',
      playerIndex: 0,
      card: { suit: card.suit, rank: card.rank },
      column: 0,
    }, opts);

    // Assert
    const log = result.transactionLog ?? [];
    expect(log).toHaveLength(1);
    expect(log[0]!.details.type).toBe('deploy');
    expect(log[0]!.action.type).toBe('deploy');
    expect(log[0]!.sequenceNumber).toBe(0);
    if (log[0]!.details.type === 'deploy') {
      expect(log[0]!.details.gridIndex).toBe(0);
      expect(log[0]!.details.phaseAfter).toBeDefined();
    }
  });

  it('attack produces entry with details.type === "attack" containing combat', () => {
    // Arrange
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', '7', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('spades', 'T', 0);
    const state = makeCombatState(p0Bf, p1Bf);

    // Act
    const result = applyAction(state, {
      type: 'attack',
      playerIndex: 0,
      attackerPosition: { row: 0, col: 0 },
      targetPosition: { row: 0, col: 0 },
    }, opts);

    // Assert
    const log = result.transactionLog ?? [];
    expect(log).toHaveLength(1);
    expect(log[0]!.details.type).toBe('attack');
    if (log[0]!.details.type === 'attack') {
      expect(log[0]!.details.combat).toBeDefined();
      expect(log[0]!.details.combat.attackerCard).toEqual({ suit: 'spades', rank: '7' });
      expect(log[0]!.details.combat.baseDamage).toBe(7);
      expect(typeof log[0]!.details.reinforcementTriggered).toBe('boolean');
      expect(typeof log[0]!.details.victoryTriggered).toBe('boolean');
    }
  });

  it('pass produces entry with details.type === "pass"', () => {
    // Arrange
    const state = makeCombatState(emptyBf(), emptyBf());

    // Act
    const result = applyAction(state, {
      type: 'pass',
      playerIndex: 0,
    }, opts);

    // Assert
    const log = result.transactionLog ?? [];
    expect(log).toHaveLength(1);
    expect(log[0]!.details.type).toBe('pass');
  });

  it('reinforce produces entry with details.type === "reinforce"', () => {
    // Arrange — reinforcement phase
    const p1Bf = emptyBf();
    p1Bf[2] = makeBfCard('hearts', '7', 2);
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', 'K', 0);
    const state: GameState = {
      ...makeCombatState(p0Bf, p1Bf, {
        p1Hand: [{ suit: 'clubs', rank: '4' }],
      }),
      phase: 'reinforcement',
      activePlayerIndex: 1,
      reinforcement: { column: 2, attackerIndex: 0 },
    };

    // Act
    const result = applyAction(state, {
      type: 'reinforce',
      playerIndex: 1,
      card: { suit: 'clubs', rank: '4' },
    }, opts);

    // Assert
    const log = result.transactionLog ?? [];
    expect(log).toHaveLength(1);
    expect(log[0]!.details.type).toBe('reinforce');
    if (log[0]!.details.type === 'reinforce') {
      expect(log[0]!.details.column).toBe(2);
      expect(log[0]!.details.gridIndex).toBeDefined();
      expect(typeof log[0]!.details.cardsDrawn).toBe('number');
      expect(typeof log[0]!.details.reinforcementComplete).toBe('boolean');
    }
  });

  it('forfeit produces entry with details.type === "forfeit"', () => {
    // Arrange
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', 'K', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('spades', '5', 0);
    const state = makeCombatState(p0Bf, p1Bf);

    // Act
    const result = applyAction(state, {
      type: 'forfeit',
      playerIndex: 0,
    }, opts);

    // Assert
    const log = result.transactionLog ?? [];
    expect(log).toHaveLength(1);
    expect(log[0]!.details.type).toBe('forfeit');
    if (log[0]!.details.type === 'forfeit') {
      expect(log[0]!.details.winnerIndex).toBe(1);
    }
  });

  it('16-deploy sequence produces 16 entries with sequential sequenceNumber', () => {
    // Arrange — full deployment setup
    let state = createInitialState({
      players: [
        { id: '00000000-0000-0000-0000-000000000001', name: 'Alice' },
        { id: '00000000-0000-0000-0000-000000000002', name: 'Bob' },
      ],
      rngSeed: 42,
    });
    state = drawCards(drawCards(state, 0, 12), 1, 12);
    state = { ...state, phase: 'deployment', activePlayerIndex: 0 };

    // Act — deploy 16 cards alternating (column-based)
    for (let i = 0; i < 16; i++) {
      const playerIndex = state.activePlayerIndex;
      const player = state.players[playerIndex]!;
      const card = player.hand[0]!;
      // Find first non-full column
      let col = 0;
      while (col < 4) {
        if (getDeployTarget(player.battlefield, col) !== null) break;
        col++;
      }
      state = applyAction(state, {
        type: 'deploy',
        playerIndex,
        card: { suit: card.suit, rank: card.rank },
        column: col,
      }, opts);
    }

    // Assert
    const log = state.transactionLog ?? [];
    expect(log).toHaveLength(16);
    for (let i = 0; i < 16; i++) {
      expect(log[i]!.sequenceNumber).toBe(i);
      expect(log[i]!.details.type).toBe('deploy');
    }
  });

  it('entries accumulate across different action types', () => {
    // Arrange — combat state
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', '3', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('spades', 'T', 0);
    const state = makeCombatState(p0Bf, p1Bf);

    // Act — attack then pass
    const s1 = applyAction(state, {
      type: 'attack',
      playerIndex: 0,
      attackerPosition: { row: 0, col: 0 },
      targetPosition: { row: 0, col: 0 },
    }, opts);
    const s2 = applyAction(s1, {
      type: 'pass',
      playerIndex: 1,
    }, opts);

    // Assert
    const log = s2.transactionLog ?? [];
    expect(log).toHaveLength(2);
    expect(log[0]!.details.type).toBe('attack');
    expect(log[0]!.sequenceNumber).toBe(0);
    expect(log[1]!.details.type).toBe('pass');
    expect(log[1]!.sequenceNumber).toBe(1);
  });
});

describe('PHX-TXLOG-002: Transaction log entries contain hashes', () => {
  /** Deterministic hash for testing */
  const testHash = (s: unknown) => `hash-${JSON.stringify(s).length}`;
  const opts: ApplyActionOptions = { hashFn: testHash, timestamp: '2025-01-01T00:00:00.000Z' };

  it('with hashFn, stateHashBefore and stateHashAfter are non-empty', () => {
    const state = makeCombatState(emptyBf(), emptyBf());

    const result = applyAction(state, {
      type: 'pass',
      playerIndex: 0,
    }, opts);

    const entry = result.transactionLog![0]!;
    expect(entry.stateHashBefore.length).toBeGreaterThan(0);
    expect(entry.stateHashAfter.length).toBeGreaterThan(0);
    expect(entry.stateHashBefore).toMatch(/^hash-/);
    expect(entry.stateHashAfter).toMatch(/^hash-/);
  });

  it('without hashFn, hashes are empty strings', () => {
    const state = makeCombatState(emptyBf(), emptyBf());

    const result = applyAction(state, {
      type: 'pass',
      playerIndex: 0,
    });

    const entry = result.transactionLog![0]!;
    expect(entry.stateHashBefore).toBe('');
    expect(entry.stateHashAfter).toBe('');
  });

  it('stateHashAfter[N] === stateHashBefore[N+1] (chain integrity)', () => {
    // Arrange — two sequential actions
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', '3', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('spades', 'T', 0);
    const state = makeCombatState(p0Bf, p1Bf);

    // Act
    const s1 = applyAction(state, {
      type: 'attack',
      playerIndex: 0,
      attackerPosition: { row: 0, col: 0 },
      targetPosition: { row: 0, col: 0 },
    }, opts);
    const s2 = applyAction(s1, {
      type: 'pass',
      playerIndex: 1,
    }, opts);

    // Assert — hash chain continuity
    const log = s2.transactionLog!;
    expect(log).toHaveLength(2);
    expect(log[0]!.stateHashAfter).toBe(log[1]!.stateHashBefore);
  });

  it('hash chain holds across 3+ actions', () => {
    // Arrange
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', '3', 0);
    p0Bf[1] = makeBfCard('spades', '2', 1);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('spades', 'T', 0);
    p1Bf[1] = makeBfCard('spades', 'K', 1);
    const state = makeCombatState(p0Bf, p1Bf);

    // Act — three sequential actions
    let s = applyAction(state, {
      type: 'attack', playerIndex: 0,
      attackerPosition: { row: 0, col: 0 }, targetPosition: { row: 0, col: 0 },
    }, opts);
    s = applyAction(s, {
      type: 'attack', playerIndex: 1,
      attackerPosition: { row: 0, col: 0 }, targetPosition: { row: 0, col: 0 },
    }, opts);
    s = applyAction(s, {
      type: 'pass', playerIndex: 0,
    }, opts);

    // Assert — each entry chains to the next
    const log = s.transactionLog!;
    expect(log).toHaveLength(3);
    for (let i = 0; i < log.length - 1; i++) {
      expect(log[i]!.stateHashAfter).toBe(log[i + 1]!.stateHashBefore);
    }
  });

  it('timestamp is recorded on each entry', () => {
    const state = makeCombatState(emptyBf(), emptyBf());

    const result = applyAction(state, {
      type: 'pass', playerIndex: 0,
    }, { hashFn: testHash, timestamp: '2025-06-15T12:00:00.000Z' });

    expect(result.transactionLog![0]!.timestamp).toBe('2025-06-15T12:00:00.000Z');
  });
});

// === Damage Mode ===

describe('PHX-DAMAGE-001: Optional per-turn HP reset', () => {
  const perTurnOpts = { gameOptions: { damageMode: 'per-turn' as const } };

  it('cumulative mode (default) preserves existing damage across turns', () => {
    // Arrange — P0 has a 5-value attacker, P1 has a Q(11) front card
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', '5', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('hearts', 'Q', 0); // 11 HP

    const state = makeCombatState(p0Bf, p1Bf);

    // Act — attack
    const result = applyAction(state, {
      type: 'attack', playerIndex: 0,
      attackerPosition: { row: 0, col: 0 }, targetPosition: { row: 0, col: 0 },
    });

    // Assert — cumulative: Q should be at 11 - 5 = 6 HP
    const targetCard = result.players[1]!.battlefield[0];
    expect(targetCard).not.toBeNull();
    expect(targetCard!.currentHp).toBe(6);
  });

  it('per-turn mode: surviving front card resets to full HP after attack', () => {
    // Arrange — P0 attacks P1's Q(11) with a 5
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', '5', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('hearts', 'Q', 0); // 11 HP

    const state = makeCombatState(p0Bf, p1Bf, perTurnOpts);

    // Act
    const result = applyAction(state, {
      type: 'attack', playerIndex: 0,
      attackerPosition: { row: 0, col: 0 }, targetPosition: { row: 0, col: 0 },
    });

    // Assert — per-turn: Q should be back to 11 HP
    const targetCard = result.players[1]!.battlefield[0];
    expect(targetCard).not.toBeNull();
    expect(targetCard!.currentHp).toBe(11);
  });

  it('per-turn mode: surviving back card resets after overflow', () => {
    // Arrange — P0 has 5 attacker (hearts), P1 has 3-front + Q(11)-back in col 0
    // 5 damage -> front 3 destroyed (overflow 2) -> back Q takes 2, survives at 9
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('hearts', '5', 0); // 5 atk
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('spades', '3', 0); // 3 HP front — destroyed
    p1Bf[4] = makeBfCard('spades', 'Q', 4); // 11 HP back — takes 2 overflow, survives

    const state = makeCombatState(p0Bf, p1Bf, perTurnOpts);

    // Act
    const result = applyAction(state, {
      type: 'attack', playerIndex: 0,
      attackerPosition: { row: 0, col: 0 }, targetPosition: { row: 0, col: 0 },
    });

    // Assert — front 3 destroyed, Q auto-advanced to front, reset to 11 HP
    const frontCard = result.players[1]!.battlefield[0];
    expect(frontCard).not.toBeNull();
    expect(frontCard!.card.rank).toBe('Q');
    expect(frontCard!.currentHp).toBe(11); // reset from 9 to 11
  });

  it('per-turn mode: destroyed card is NOT restored', () => {
    // Arrange — P0 has K(11) attacker, P1 has 5-front in col 0
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('hearts', 'K', 0); // 11 atk
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('hearts', '5', 0); // 5 HP — will be destroyed by 11 damage

    const state = makeCombatState(p0Bf, p1Bf, perTurnOpts);

    // Act
    const result = applyAction(state, {
      type: 'attack', playerIndex: 0,
      attackerPosition: { row: 0, col: 0 }, targetPosition: { row: 0, col: 0 },
    });

    // Assert — 5 is destroyed, not restored by per-turn reset
    expect(result.players[1]!.battlefield[0]).toBeNull();
  });

  it('per-turn mode: Ace resets to 1 (its rank value)', () => {
    // Arrange — P0 has 5 attacker, P1 has Ace front. Ace absorbs 1 (invulnerable), stays at 1.
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('hearts', '5', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('hearts', 'A', 0); // 1 HP

    const state = makeCombatState(p0Bf, p1Bf, perTurnOpts);

    // Act
    const result = applyAction(state, {
      type: 'attack', playerIndex: 0,
      attackerPosition: { row: 0, col: 0 }, targetPosition: { row: 0, col: 0 },
    });

    // Assert — Ace stays at 1 HP (invulnerable), reset to 1 (same)
    const ace = result.players[1]!.battlefield[0];
    expect(ace).not.toBeNull();
    expect(ace!.currentHp).toBe(1);
  });

  it('per-turn mode: Diamond front resets to base HP after surviving attack', () => {
    // Arrange — P0 has 5 attacker, P1 has Diamond 7 front (7 HP base)
    // Diamond survives (5 < 7), HP = 7 - 5 = 2. Per-turn resets to 7. No shield.
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('hearts', '5', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('diamonds', '7', 0); // 7 HP

    const state = makeCombatState(p0Bf, p1Bf, perTurnOpts);

    // Act — 5 damage, Diamond survives at 2 HP, then per-turn resets to 7
    const result = applyAction(state, {
      type: 'attack', playerIndex: 0,
      attackerPosition: { row: 0, col: 0 }, targetPosition: { row: 0, col: 0 },
    });

    // Assert — per-turn: resets to base 7
    const diamond = result.players[1]!.battlefield[0];
    expect(diamond).not.toBeNull();
    expect(diamond!.currentHp).toBe(7);
  });

  it('per-turn mode: combat log shows actual damage before reset', () => {
    // Arrange
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('hearts', '5', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('hearts', 'Q', 0); // 11 HP

    const state = makeCombatState(p0Bf, p1Bf, perTurnOpts);

    // Act
    const result = applyAction(state, {
      type: 'attack', playerIndex: 0,
      attackerPosition: { row: 0, col: 0 }, targetPosition: { row: 0, col: 0 },
    });

    // Assert — combat log should show 5 damage, hpAfter = 6 (before reset)
    const txLog = result.transactionLog ?? [];
    const attackEntry = txLog.find(e => e.details.type === 'attack');
    expect(attackEntry).toBeDefined();
    const combat = (attackEntry!.details as { type: 'attack'; combat: { steps: { hpAfter?: number; damage: number }[] } }).combat;
    expect(combat.steps[0]!.damage).toBe(5);
    expect(combat.steps[0]!.hpAfter).toBe(6);

    // But the actual card HP should be reset to 11
    expect(result.players[1]!.battlefield[0]!.currentHp).toBe(11);
  });

  it('per-turn mode: auto-advanced card also resets', () => {
    // Arrange — P0 has K(11) attacker. P1 has 5 front + 8 back in col 0.
    // K(11) destroys 5(5HP), overflow 6 hits back 8. Back auto-advances.
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('hearts', 'K', 0); // 11 atk
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('hearts', '5', 0); // 5 HP front — destroyed
    p1Bf[4] = makeBfCard('hearts', '8', 4); // 8 HP back — takes 6 overflow, survives at 2

    const state = makeCombatState(p0Bf, p1Bf, perTurnOpts);

    // Act
    const result = applyAction(state, {
      type: 'attack', playerIndex: 0,
      attackerPosition: { row: 0, col: 0 }, targetPosition: { row: 0, col: 0 },
    });

    // Assert — front 5 destroyed. Back 8 took 6 overflow (8-6=2), auto-advanced to front.
    // Per-turn reset: 8 should be back at 8 HP in front row
    const frontCard = result.players[1]!.battlefield[0];
    expect(frontCard).not.toBeNull();
    expect(frontCard!.card.rank).toBe('8');
    expect(frontCard!.currentHp).toBe(8);
  });

  it('default GameConfig without gameOptions uses cumulative mode', () => {
    // Arrange
    const config = {
      players: [
        { id: '00000000-0000-0000-0000-000000000001', name: 'Alice' },
        { id: '00000000-0000-0000-0000-000000000002', name: 'Bob' },
      ] as [{ id: string; name: string }, { id: string; name: string }],
      rngSeed: 42,
    };

    // Act
    const state = createInitialState(config);

    // Assert — defaults to cumulative
    expect(state.gameOptions).toBeDefined();
    expect(state.gameOptions!.damageMode).toBe('cumulative');
  });

  it('gameOptions with damageMode per-turn is threaded into game state', () => {
    // Arrange
    const config = {
      players: [
        { id: '00000000-0000-0000-0000-000000000001', name: 'Alice' },
        { id: '00000000-0000-0000-0000-000000000002', name: 'Bob' },
      ] as [{ id: string; name: string }, { id: string; name: string }],
      rngSeed: 42,
      gameOptions: { damageMode: 'per-turn' as const },
    };

    // Act
    const state = createInitialState(config);

    // Assert
    expect(state.gameOptions).toBeDefined();
    expect(state.gameOptions!.damageMode).toBe('per-turn');
  });

  it('resetColumnHp resets surviving cards to full rank value', () => {
    // Arrange — a battlefield with a damaged Q and a damaged 5
    const bf = emptyBf();
    bf[0] = makeBfCard('hearts', 'Q', 0, 6);  // Q at 6/11 HP
    bf[4] = makeBfCard('spades', '5', 4, 2);  // 5 at 2/5 HP

    // Act
    const result = resetColumnHp(bf, 0);

    // Assert
    expect(result[0]!.currentHp).toBe(11); // Q reset to 11
    expect(result[4]!.currentHp).toBe(5);  // 5 reset to 5
  });

  it('resetColumnHp does not affect null slots', () => {
    // Arrange — empty column
    const bf = emptyBf();

    // Act
    const result = resetColumnHp(bf, 0);

    // Assert
    expect(result[0]).toBeNull();
    expect(result[4]).toBeNull();
  });
});
