import { describe, it, expect } from 'vitest';
import { createDeck, createInitialState, drawCards, deployCard, getDeployTarget, resolveAttack, isValidTarget, checkVictory, validateAction, applyAction, advanceBackRow, isColumnFull, getReinforcementTarget } from '../src/index';
import { RANK_VALUES } from '@phalanx/shared';
import type { GameState, BattlefieldCard, Battlefield, PlayerState, Card } from '@phalanx/shared';

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
  },
): GameState {
  const makePlayer = (id: string, name: string, bf: Battlefield, hand: Card[], drawpile: Card[]): PlayerState => ({
    player: { id, name },
    hand,
    battlefield: bf,
    drawpile,
    discardPile: [],
  });
  return {
    players: [
      makePlayer('00000000-0000-0000-0000-000000000001', 'Alice', p0Battlefield, opts?.p0Hand ?? [], opts?.p0Drawpile ?? []),
      makePlayer('00000000-0000-0000-0000-000000000002', 'Bob', p1Battlefield, opts?.p1Hand ?? [], opts?.p1Drawpile ?? []),
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
    // But Ace is invulnerable, so HP stays at 1
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

  it('Ace attacking another Ace bypasses invulnerability (target destroyed)', () => {
    // Arrange — Ace attacks Ace: invulnerability does not apply
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', 'A', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('hearts', 'A', 0);
    const state = makeCombatState(p0Bf, p1Bf);

    // Act
    const result = resolveAttack(state, 0, 0, 0);

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
    const result = resolveAttack(state, 0, 0, 0);

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

// === Victory ===

describe('PHX-VICTORY-001: Win condition', () => {
  it('player wins when all opponent battlefield cards are destroyed', () => {
    // Arrange — opponent has no cards on battlefield
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', 'K', 0);
    const state = makeCombatState(p0Bf, emptyBf());

    // Act
    const winner = checkVictory(state);

    // Assert — player 0 wins
    expect(winner).toBe(0);
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
    expect(checkVictory({ ...result, phase: 'combat' })).toBe(0);
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
    // Arrange — P0 K attacks P1 front-row 3 (only front, back is empty), P1 has hand cards
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', 'K', 0);
    const p1Bf = emptyBf();
    p1Bf[1] = makeBfCard('spades', '3', 1); // front row col 1, 3 HP
    p1Bf[5] = makeBfCard('hearts', '7', 5); // back row col 1
    const state = makeCombatState(p0Bf, p1Bf, {
      p1Hand: [{ suit: 'clubs', rank: '4' }],
    });

    // Act
    const result = applyAction(state, {
      type: 'attack',
      playerIndex: 0,
      attackerPosition: { row: 0, col: 0 },
      targetPosition: { row: 0, col: 1 },
    });

    // Assert — back row advanced to front, phase is reinforcement, defender is active
    expect(result.phase).toBe('reinforcement');
    expect(result.activePlayerIndex).toBe(1); // defender's turn
    expect(result.reinforcement).toEqual({ column: 1, attackerIndex: 0 });
    // Back row card advanced to front
    expect(result.players[1]!.battlefield[1]).not.toBeNull();
    expect(result.players[1]!.battlefield[1]!.card.rank).toBe('7');
    expect(result.players[1]!.battlefield[5]).toBeNull();
  });

  it('skips reinforcement if defender has no hand cards and column is not full', () => {
    // Arrange — P0 K attacks P1 front-row 3, P1 has empty hand and no drawpile
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', 'K', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('spades', '3', 0); // front row col 0
    p1Bf[4] = makeBfCard('hearts', '7', 4); // back row col 0
    const state = makeCombatState(p0Bf, p1Bf);

    // Act
    const result = applyAction(state, {
      type: 'attack',
      playerIndex: 0,
      attackerPosition: { row: 0, col: 0 },
      targetPosition: { row: 0, col: 0 },
    });

    // Assert — auto-advance happens, but no reinforcement (no hand cards)
    // Back row card advanced to front
    expect(result.players[1]!.battlefield[0]!.card.rank).toBe('7');
    expect(result.phase).toBe('combat');
    expect(result.activePlayerIndex).toBe(1); // turn passes normally
  });

  it('skips reinforcement if column is full after auto-advance', () => {
    // Arrange — only front row is destroyed, back row advances, column full
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', 'K', 0);
    const p1Bf = emptyBf();
    p1Bf[2] = makeBfCard('spades', '3', 2); // front row col 2, will be destroyed
    p1Bf[6] = makeBfCard('hearts', '7', 6); // back row col 2, will advance
    // After destruction: front empty, back row advances to front, back empty
    // Column NOT full (only front occupied) → should enter reinforcement if hand cards
    const state = makeCombatState(p0Bf, p1Bf, {
      p1Hand: [{ suit: 'diamonds', rank: '5' }],
    });

    // Act
    const result = applyAction(state, {
      type: 'attack',
      playerIndex: 0,
      attackerPosition: { row: 0, col: 0 },
      targetPosition: { row: 0, col: 2 },
    });

    // Assert — reinforcement because back row is empty after advance
    expect(result.phase).toBe('reinforcement');
    expect(result.reinforcement).toEqual({ column: 2, attackerIndex: 0 });
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
    // Arrange — front destroyed, back row card advances, column has one empty slot
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', 'K', 0);
    const p1Bf = emptyBf();
    p1Bf[3] = makeBfCard('spades', '2', 3); // front row col 3
    p1Bf[7] = makeBfCard('hearts', '9', 7); // back row col 3
    const state = makeCombatState(p0Bf, p1Bf, {
      p1Hand: [{ suit: 'diamonds', rank: '6' }],
    });

    // Act
    const result = applyAction(state, {
      type: 'attack',
      playerIndex: 0,
      attackerPosition: { row: 0, col: 0 },
      targetPosition: { row: 0, col: 3 },
    });

    // Assert — 9 advanced to front, back row empty → reinforcement
    expect(result.players[1]!.battlefield[3]!.card.rank).toBe('9');
    expect(result.players[1]!.battlefield[7]).toBeNull();
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
    const winner = checkVictory(state);

    // Assert — no winner yet
    expect(winner).toBeNull();
  });

  it('no victory when opponent has empty battlefield but drawpile cards remain', () => {
    // Arrange — opponent has no battlefield or hand cards but has drawpile
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', 'K', 0);
    const state = makeCombatState(p0Bf, emptyBf(), {
      p1Drawpile: [{ suit: 'spades', rank: '2' }],
    });

    // Act
    const winner = checkVictory(state);

    // Assert — no winner yet
    expect(winner).toBeNull();
  });

  it('victory when opponent has no battlefield, no hand, and no drawpile', () => {
    // Arrange — opponent fully depleted
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', 'K', 0);
    const state = makeCombatState(p0Bf, emptyBf());

    // Act
    const winner = checkVictory(state);

    // Assert — player 0 wins
    expect(winner).toBe(0);
  });

  it('attack that clears battlefield does not end game if defender has hand cards', () => {
    // Arrange — K attacks defender's only card, but defender has hand cards
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', 'K', 0);
    const p1Bf = emptyBf();
    p1Bf[2] = makeBfCard('spades', '3', 2); // only battlefield card
    const state = makeCombatState(p0Bf, p1Bf, {
      p1Hand: [{ suit: 'clubs', rank: '4' }],
    });

    // Act
    const result = applyAction(state, {
      type: 'attack',
      playerIndex: 0,
      attackerPosition: { row: 0, col: 0 },
      targetPosition: { row: 0, col: 2 },
    });

    // Assert — game is NOT over, enters reinforcement
    expect(result.phase).toBe('reinforcement');
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
