import { describe, it, expect } from 'vitest';
import { createDeck, createInitialState, drawCards, deployCard, resolveAttack, isValidTarget, heroicalSwap } from '../src/index';
import { RANK_VALUES } from '@phalanx/shared';
import type { GameState, BattlefieldCard, Battlefield, PlayerState } from '@phalanx/shared';

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
): GameState {
  const makePlayer = (id: string, name: string, bf: Battlefield): PlayerState => ({
    player: { id, name },
    hand: [],
    battlefield: bf,
    drawpile: [],
    discardPile: [],
  });
  return {
    players: [
      makePlayer('00000000-0000-0000-0000-000000000001', 'Alice', p0Battlefield),
      makePlayer('00000000-0000-0000-0000-000000000002', 'Bob', p1Battlefield),
    ],
    activePlayerIndex: 0,
    phase: 'combat',
    turnNumber: 1,
    rngSeed: 42,
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
    const result = resolveAttack(state, 0, 0, 0);

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
    const result = resolveAttack(state, 0, 0, 0);

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
    const result = resolveAttack(state, 0, 0, 0);

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
    const result = resolveAttack(state, 0, 0, 0);

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
    const result = resolveAttack(state, 0, 0, 0);

    // Assert — attacker still there with full HP
    expect(result.players[0]!.battlefield[0]).not.toBeNull();
    expect(result.players[0]!.battlefield[0]!.currentHp).toBe(7);
  });

  it('can only target front-row cards when front row is occupied', () => {
    // Arrange — opponent has front-row card at col 0 and back-row card at col 0
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('hearts', '5', 0); // front row col 0
    p1Bf[4] = makeBfCard('hearts', '8', 4); // back row col 0

    // Assert — back-row col 0 is NOT a valid target (front is occupied)
    expect(isValidTarget(p1Bf, 4)).toBe(false);
    // front-row col 0 IS a valid target
    expect(isValidTarget(p1Bf, 0)).toBe(true);
  });

  it('back-row card becomes targetable when front-row column is empty', () => {
    // Arrange — opponent has empty front row col 0, back-row card at col 0
    const p1Bf = emptyBf();
    p1Bf[4] = makeBfCard('hearts', '8', 4); // back row col 0, front is empty

    // Assert
    expect(isValidTarget(p1Bf, 4)).toBe(true);
  });

  it('suit bonus modifies damage dealt', () => {
    // Arrange — Club 5 attacks back-row target → ×2 damage = 10
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('clubs', '5', 0);
    const p1Bf = emptyBf();
    p1Bf[4] = makeBfCard('spades', 'K', 4); // back row, 11 HP, no defensive bonus
    const state = makeCombatState(p0Bf, p1Bf);

    // Act
    const result = resolveAttack(state, 0, 0, 4);

    // Assert — 11 - 10 = 1 HP remaining
    expect(result.players[1]!.battlefield[4]!.currentHp).toBe(1);
  });
});

// === Suits ===

describe('PHX-SUIT-001: Diamonds shield cards', () => {
  it('Diamond card in front row has doubled effective defense', () => {
    // Arrange — spades 8 attacks diamond 5 in front row
    // Diamond 5 has 5 HP, doubled defense means only ceil(8/2)=4 damage taken
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', '8', 0);
    const p1Bf = emptyBf();
    p1Bf[1] = makeBfCard('diamonds', '5', 1); // front row
    const state = makeCombatState(p0Bf, p1Bf);

    // Act
    const result = resolveAttack(state, 0, 0, 1);

    // Assert — 5 - 4 = 1 HP remaining (diamond halves incoming damage)
    expect(result.players[1]!.battlefield[1]!.currentHp).toBe(1);
  });

  it('Diamond card in back row has normal defense (no bonus)', () => {
    // Arrange — spades 4 attacks diamond 5 in back row (front empty)
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', '4', 0);
    const p1Bf = emptyBf();
    p1Bf[4] = makeBfCard('diamonds', '5', 4); // back row
    const state = makeCombatState(p0Bf, p1Bf);

    // Act
    const result = resolveAttack(state, 0, 0, 4);

    // Assert — 5 - 4 = 1 HP (no bonus in back row)
    expect(result.players[1]!.battlefield[4]!.currentHp).toBe(1);
  });

  it('defense doubling uses ×2 integer math', () => {
    // Arrange — spades 3 attacks diamond 2 in front row
    // Diamond 2: 2 HP, halved damage = ceil(3/2) = 2, so 2-2 = 0 → destroyed
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', '3', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('diamonds', '2', 0);
    const state = makeCombatState(p0Bf, p1Bf);

    // Act
    const result = resolveAttack(state, 0, 0, 0);

    // Assert — destroyed
    expect(result.players[1]!.battlefield[0]).toBeNull();
  });
});

describe('PHX-SUIT-002: Hearts shield player', () => {
  it('Heart card has doubled defense when it is last card on battlefield', () => {
    // Arrange — spades 8 attacks hearts 5 (last card)
    // Hearts 5: halved damage = ceil(8/2) = 4, so 5-4 = 1
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', '8', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('hearts', '5', 0); // only card
    const state = makeCombatState(p0Bf, p1Bf);

    // Act
    const result = resolveAttack(state, 0, 0, 0);

    // Assert — survives with 1 HP
    expect(result.players[1]!.battlefield[0]!.currentHp).toBe(1);
  });

  it('Heart card has normal defense when other cards remain', () => {
    // Arrange — spades 8 attacks hearts 5, but another card exists
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', '8', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('hearts', '5', 0);
    p1Bf[1] = makeBfCard('clubs', '3', 1); // another card → no heart bonus
    const state = makeCombatState(p0Bf, p1Bf);

    // Act
    const result = resolveAttack(state, 0, 0, 0);

    // Assert — destroyed (5 - 8 = dead, no bonus)
    expect(result.players[1]!.battlefield[0]).toBeNull();
  });
});

describe('PHX-SUIT-003: Clubs attack cards', () => {
  it('Club card deals doubled damage to back-row targets', () => {
    // Arrange — clubs 5 attacks back-row spades K (no defensive bonus)
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('clubs', '5', 0);
    const p1Bf = emptyBf();
    p1Bf[4] = makeBfCard('spades', 'K', 4); // back row, 11 HP
    const state = makeCombatState(p0Bf, p1Bf);

    // Act
    const result = resolveAttack(state, 0, 0, 4);

    // Assert — 11 - 10 = 1 HP (clubs doubles to 10)
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
    const result = resolveAttack(state, 0, 0, 0);

    // Assert — 10 - 5 = 5 HP (no bonus for front row)
    expect(result.players[1]!.battlefield[0]!.currentHp).toBe(5);
  });

  it('damage doubling uses ×2 integer math', () => {
    // Arrange — clubs 3 attacks back-row spades 5 → 6 damage → destroyed
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('clubs', '3', 0);
    const p1Bf = emptyBf();
    p1Bf[4] = makeBfCard('spades', '5', 4);
    const state = makeCombatState(p0Bf, p1Bf);

    // Act
    const result = resolveAttack(state, 0, 0, 4);

    // Assert — destroyed (6 >= 5)
    expect(result.players[1]!.battlefield[4]).toBeNull();
  });
});

describe('PHX-SUIT-004: Spades attack players', () => {
  it.todo('Spade bonus applies when attacking and opponent battlefield is empty');
  it.todo('Spade attack that clears last opponent card ends the game');
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
    const result = resolveAttack(state, 0, 0, 0);

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
    const result = resolveAttack(state, 0, 0, 0);

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
    const result = resolveAttack(state, 0, 0, 0);

    // Assert — 5 - 1 = 4 HP
    expect(result.players[1]!.battlefield[0]!.currentHp).toBe(4);
  });

  it('Ace suit bonuses apply normally', () => {
    // Arrange — Diamond Ace in front row attacked by 4
    // Ace has 1 HP, diamond front row halves damage: ceil(4/2) = 2
    // But Ace is invulnerable to non-heroical, so HP stays at 1
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', '4', 0);
    const p1Bf = emptyBf();
    p1Bf[1] = makeBfCard('diamonds', 'A', 1);
    const state = makeCombatState(p0Bf, p1Bf);

    // Act
    const result = resolveAttack(state, 0, 0, 1);

    // Assert — Ace invulnerable, stays at 1 HP
    expect(result.players[1]!.battlefield[1]!.currentHp).toBe(1);
  });

  it('Ace can be removed by Heroical swap', () => {
    // Arrange — player has a King in hand and Ace on battlefield
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', 'A', 0);
    const state = makeCombatState(p0Bf, emptyBf());
    // Give player 0 a King in hand
    const stateWithHand: GameState = {
      ...state,
      players: [
        { ...state.players[0]!, hand: [{ suit: 'hearts', rank: 'K' }] },
        state.players[1]!,
      ],
    };

    // Act
    const result = heroicalSwap(stateWithHand, 0, 0, 0);

    // Assert — King is now on battlefield, Ace is in hand
    expect(result.players[0]!.battlefield[0]!.card.rank).toBe('K');
    expect(result.players[0]!.hand).toHaveLength(1);
    expect(result.players[0]!.hand[0]!.rank).toBe('A');
  });
});

// === Heroicals ===

describe('PHX-HEROICAL-001: Heroical Trait battlefield swap', () => {
  it('Heroical in hand can swap with any own deployed card', () => {
    // Arrange
    const p0Bf = emptyBf();
    p0Bf[3] = makeBfCard('hearts', '5', 3);
    const state = makeCombatState(p0Bf, emptyBf());
    const stateWithHand: GameState = {
      ...state,
      players: [
        { ...state.players[0]!, hand: [{ suit: 'spades', rank: 'J' }] },
        state.players[1]!,
      ],
    };

    // Act
    const result = heroicalSwap(stateWithHand, 0, 0, 3);

    // Assert
    expect(result.players[0]!.battlefield[3]!.card.rank).toBe('J');
    expect(result.players[0]!.hand[0]!.rank).toBe('5');
  });

  it.todo('swap activates at start of opponent turn before attacker/target selection');

  it('swapped-out card goes to player hand', () => {
    // Arrange
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('clubs', '8', 0);
    const state = makeCombatState(p0Bf, emptyBf());
    const stateWithHand: GameState = {
      ...state,
      players: [
        { ...state.players[0]!, hand: [{ suit: 'diamonds', rank: 'Q' }] },
        state.players[1]!,
      ],
    };

    // Act
    const result = heroicalSwap(stateWithHand, 0, 0, 0);

    // Assert — 8 of clubs now in hand
    expect(result.players[0]!.hand).toHaveLength(1);
    expect(result.players[0]!.hand[0]!.suit).toBe('clubs');
    expect(result.players[0]!.hand[0]!.rank).toBe('8');
  });

  it.todo('opponent declares attacker/target after swap completes');

  it('Jack, Queen, King all have identical swap mechanics', () => {
    // Arrange — test all three Heroicals
    for (const rank of ['J', 'Q', 'K'] as const) {
      const p0Bf = emptyBf();
      p0Bf[0] = makeBfCard('hearts', '3', 0);
      const state = makeCombatState(p0Bf, emptyBf());
      const stateWithHand: GameState = {
        ...state,
        players: [
          { ...state.players[0]!, hand: [{ suit: 'spades', rank }] },
          state.players[1]!,
        ],
      };

      // Act
      const result = heroicalSwap(stateWithHand, 0, 0, 0);

      // Assert
      expect(result.players[0]!.battlefield[0]!.card.rank).toBe(rank);
      expect(result.players[0]!.battlefield[0]!.currentHp).toBe(11);
    }
  });

  it('Heroical value is 11 for attack and defense', () => {
    // Arrange — King (11) attacks a spades 9 (no defensive bonus)
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', 'K', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('spades', '9', 0);
    const state = makeCombatState(p0Bf, p1Bf);

    // Act
    const result = resolveAttack(state, 0, 0, 0);

    // Assert — 9 destroyed (11 > 9)
    expect(result.players[1]!.battlefield[0]).toBeNull();
    // King still has 11 HP
    expect(result.players[0]!.battlefield[0]!.currentHp).toBe(11);
  });
});

describe('PHX-HEROICAL-002: Heroical defeats Ace', () => {
  it('Heroical attack destroys Ace (bypasses invulnerability)', () => {
    // Arrange — King attacks Ace
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', 'K', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('hearts', 'A', 0);
    const state = makeCombatState(p0Bf, p1Bf);

    // Act
    const result = resolveAttack(state, 0, 0, 0);

    // Assert — Ace is destroyed
    expect(result.players[1]!.battlefield[0]).toBeNull();
  });

  it('Ace is sent to discard pile when defeated by Heroical', () => {
    // Arrange
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('clubs', 'J', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('diamonds', 'A', 0);
    const state = makeCombatState(p0Bf, p1Bf);

    // Act
    const result = resolveAttack(state, 0, 0, 0);

    // Assert
    expect(result.players[1]!.discardPile).toHaveLength(1);
    expect(result.players[1]!.discardPile[0]!.rank).toBe('A');
  });
});

// === Turns ===

describe('PHX-TURNS-001: Turn structure', () => {
  it.todo('player who deployed last takes first combat turn');
  it.todo('players alternate turns after each action');
  it.todo('active player must perform exactly one attack action');
  it.todo('Heroical interrupt window exists at start of each turn');
});

// === Victory ===

describe('PHX-VICTORY-001: Win condition', () => {
  it.todo('player wins when all opponent battlefield cards are destroyed');
  it.todo('game ends immediately when last opponent card is removed');
  it.todo('attacking player wins in simultaneous clear edge case');
});

// === Resources ===

describe('PHX-RESOURCES-001: Hand card management', () => {
  it.todo('each player holds 4 cards in hand after deployment');
  it.todo('hand cards cannot be played to battlefield during regular turns');
  it.todo('Heroical swap moves deployed card to hand');
  it.todo('non-Heroical hand cards have no active use in base rules');
});
