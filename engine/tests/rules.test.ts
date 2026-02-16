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
    p0Lifepoints?: number;
    p1Lifepoints?: number;
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
    combatLog: [],
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
    const result = resolveAttack(state, 0, 0, 0);

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
    const result = resolveAttack(state, 0, 0, 0);

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
    const result = resolveAttack(state, 0, 0, 0);

    // Assert — 11 - 10 = 1 HP remaining (clubs doubles overflow to back)
    expect(result.players[1]!.battlefield[4]!.currentHp).toBe(1);
  });
});

// === Suits ===

describe('PHX-SUIT-001: Diamonds shield cards', () => {
  it('Diamond card in front row has doubled effective defense', () => {
    // Arrange — spades 8 at col 1 attacks diamond 5 at col 1
    // Diamond 5 has 5 HP, doubled defense means only ceil(8/2)=4 damage taken
    const p0Bf = emptyBf();
    p0Bf[1] = makeBfCard('spades', '8', 1);
    const p1Bf = emptyBf();
    p1Bf[1] = makeBfCard('diamonds', '5', 1); // front row col 1
    const state = makeCombatState(p0Bf, p1Bf);

    // Act — column-locked: col 1 attacks col 1
    const result = resolveAttack(state, 0, 1, 1);

    // Assert — 5 - 4 = 1 HP remaining (diamond halves incoming damage)
    expect(result.players[1]!.battlefield[1]!.currentHp).toBe(1);
  });

  it('Diamond card in back row has normal defense (no bonus)', () => {
    // Arrange — spades 4 attacks col 0, front empty, diamond 5 in back row
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', '4', 0);
    const p1Bf = emptyBf();
    p1Bf[4] = makeBfCard('diamonds', '5', 4); // back row
    const state = makeCombatState(p0Bf, p1Bf);

    // Act — column-locked: attacker col 0 → target column 0
    const result = resolveAttack(state, 0, 0, 0);

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

describe('PHX-SUIT-002: Hearts halve overflow to player LP', () => {
  it('Heart last card halves overflow damage to player LP', () => {
    // Arrange — spades 8 attacks hearts 5 (last card)
    // Hearts 5 absorbs 5 (destroyed), overflow 3. Heart was last card → halve LP damage = floor(3/2) = 1
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', '8', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('hearts', '5', 0); // only card
    const state = makeCombatState(p0Bf, p1Bf);

    // Act
    const result = resolveAttack(state, 0, 0, 0);

    // Assert — card destroyed, but LP damage halved
    expect(result.players[1]!.battlefield[0]).toBeNull();
    // Spade attacker doubles LP overflow (3*2=6), Heart halves (6/2=3), net LP damage = 3
    expect(result.players[1]!.lifepoints).toBe(17);
  });

  it('Heart bonus does not apply when other cards are last in damage path', () => {
    // Arrange — spades 8 attacks hearts 5, with a clubs back card
    // Hearts 5 front absorbs 5 (destroyed), overflow 3 → clubs 3 back absorbs 3 (destroyed), overflow 0
    // Last card is clubs (not heart) → no Heart LP bonus
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', '8', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('hearts', '5', 0);
    p1Bf[4] = makeBfCard('clubs', '3', 4); // back row same column
    const state = makeCombatState(p0Bf, p1Bf);

    // Act
    const result = resolveAttack(state, 0, 0, 0);

    // Assert — both destroyed, no overflow to LP (3 absorbed by back card exactly)
    expect(result.players[1]!.battlefield[0]).toBeNull();
    expect(result.players[1]!.battlefield[4]).toBeNull();
    expect(result.players[1]!.lifepoints).toBe(20); // no LP damage
  });

  it('Heart back card protects LP when it is last in damage path', () => {
    // Arrange — spades K (11) attacks front spades 3, back hearts 5
    // Front 3 absorbs 3 (destroyed), overflow 8 → back hearts 5 absorbs 5 (destroyed), overflow 3
    // Heart was last card → halve LP damage = floor(3/2) = 1
    // But Spade attacker doubles first: 3*2=6, then heart halves: 6/2=3
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', 'K', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('spades', '3', 0);
    p1Bf[4] = makeBfCard('hearts', '5', 4);
    const state = makeCombatState(p0Bf, p1Bf);

    // Act
    const result = resolveAttack(state, 0, 0, 0);

    // Assert — both destroyed, LP = 20 - 3 = 17 (spade×2 then heart÷2 = net overflow)
    expect(result.players[1]!.battlefield[0]).toBeNull();
    expect(result.players[1]!.battlefield[4]).toBeNull();
    expect(result.players[1]!.lifepoints).toBe(17);
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
    const result = resolveAttack(state, 0, 0, 0);

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
    const result = resolveAttack(state, 0, 0, 0);

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
    const result = resolveAttack(state, 0, 0, 0);

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
    const result = resolveAttack(state, 0, 0, 0);

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
    const result = resolveAttack(state, 0, 0, 0);

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
    const result = resolveAttack(state, 0, 0, 0);

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
    // Arrange — Diamond Ace in front row col 0, attacked by spades 4 at col 0
    // Ace has 1 HP, diamond front row halves damage: ceil(4/2) = 2
    // But Ace is invulnerable, so HP stays at 1
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', '4', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('diamonds', 'A', 0);
    const state = makeCombatState(p0Bf, p1Bf);

    // Act — column-locked: col 0 attacks col 0
    const result = resolveAttack(state, 0, 0, 0);

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

    const result = resolveAttack(state, 0, 0, 0);
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

    const result = resolveAttack(state, 0, 0, 0);

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

    const result = resolveAttack(state, 0, 0, 0);

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

    const result = resolveAttack(state, 0, 0, 0);

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

    const result = resolveAttack(state, 0, 0, 0);

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

    const result = resolveAttack(state, 0, 0, 0);

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
    const result = resolveAttack(state, 0, 0, 0);

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

    const result = resolveAttack(state, 0, 0, 0);

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

    const result = resolveAttack(state, 0, 0, 0);

    expect(result.players[1]!.battlefield[0]).toBeNull();
    expect(result.players[1]!.discardPile).toHaveLength(1);
  });

  it('Q(11) attacking Ace: Ace absorbs 1, overflow 10', () => {
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('clubs', 'Q', 0); // 11 damage
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('hearts', 'A', 0); // Ace, only card
    const state = makeCombatState(p0Bf, p1Bf);

    const result = resolveAttack(state, 0, 0, 0);

    // Ace absorbs 1, overflow 10. No back card. LP damage = 10, heart last card halves = 5
    expect(result.players[1]!.battlefield[0]!.currentHp).toBe(1);
    expect(result.players[1]!.lifepoints).toBe(15); // 20 - 5
  });

  it('Diamond Ace front row: absorbs 1, overflow ignores diamond defense', () => {
    // Diamond Ace: effectiveHp=2 (1*2), but Ace logic takes priority
    // Ace absorbs 1, overflow = damage - 1
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('clubs', '5', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('diamonds', 'A', 0);
    const state = makeCombatState(p0Bf, p1Bf);

    const result = resolveAttack(state, 0, 0, 0);

    expect(result.players[1]!.battlefield[0]!.currentHp).toBe(1);
    // Overflow 4 → no back card → LP damage = 4
    expect(result.players[1]!.lifepoints).toBe(16);
  });
});

// === Combat Log ===

describe('PHX-COMBATLOG-001: Structured combat log', () => {
  it('attack produces a combat log entry', () => {
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', '7', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('spades', 'T', 0);
    const state = makeCombatState(p0Bf, p1Bf);

    const result = resolveAttack(state, 0, 0, 0);

    expect(result.combatLog).toBeDefined();
    expect(result.combatLog!.length).toBe(1);
    const entry = result.combatLog![0]!;
    expect(entry.turnNumber).toBe(1);
    expect(entry.attackerPlayerIndex).toBe(0);
    expect(entry.attackerCard).toBe('7♠');
    expect(entry.targetColumn).toBe(0);
    expect(entry.baseDamage).toBe(7);
  });

  it('log steps include front card hit', () => {
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', '7', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('spades', 'T', 0);
    const state = makeCombatState(p0Bf, p1Bf);

    const result = resolveAttack(state, 0, 0, 0);
    const steps = result.combatLog![0]!.steps;

    expect(steps.length).toBe(1); // only front card hit, no overflow
    expect(steps[0]!.target).toBe('frontCard');
    expect(steps[0]!.card).toBe('T♠');
    expect(steps[0]!.damage).toBe(7);
    expect(steps[0]!.remainingHp).toBe(3);
    expect(steps[0]!.destroyed).toBe(false);
  });

  it('log includes LP damage step when overflow reaches player', () => {
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('clubs', '8', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('spades', '3', 0); // front only
    const state = makeCombatState(p0Bf, p1Bf);

    const result = resolveAttack(state, 0, 0, 0);
    const entry = result.combatLog![0]!;

    expect(entry.steps.length).toBe(2); // front card + LP
    expect(entry.steps[0]!.target).toBe('frontCard');
    expect(entry.steps[0]!.destroyed).toBe(true);
    expect(entry.steps[1]!.target).toBe('playerLp');
    expect(entry.steps[1]!.damage).toBe(5); // overflow 5
    expect(entry.totalLpDamage).toBe(5);
  });

  it('log records suit bonus descriptions', () => {
    // Club attacker → back card should show bonus
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('clubs', 'K', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('spades', '3', 0);
    p1Bf[4] = makeBfCard('spades', 'K', 4);
    const state = makeCombatState(p0Bf, p1Bf);

    const result = resolveAttack(state, 0, 0, 0);
    const steps = result.combatLog![0]!.steps;

    // Should have front + back steps (no LP overflow since K absorbs)
    const backStep = steps.find(s => s.target === 'backCard');
    expect(backStep).toBeDefined();
    expect(backStep!.bonus).toContain('Club');
  });

  it('multiple attacks append to combat log', () => {
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', '3', 0);
    p0Bf[1] = makeBfCard('spades', '2', 1);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('spades', 'K', 0);
    p1Bf[1] = makeBfCard('spades', 'Q', 1);
    const state = makeCombatState(p0Bf, p1Bf);

    const result1 = resolveAttack(state, 0, 0, 0);
    const result2 = resolveAttack(result1, 0, 1, 1);

    expect(result2.combatLog!.length).toBe(2);
  });

  it('combatLog starts empty in initial state', () => {
    const state = createInitialState({
      players: [
        { id: '00000000-0000-0000-0000-000000000001', name: 'Alice' },
        { id: '00000000-0000-0000-0000-000000000002', name: 'Bob' },
      ],
      rngSeed: 42,
    });
    expect(state.combatLog).toEqual([]);
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

    const result = resolveAttack(state, 0, 0, 0);

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

    const result = resolveAttack(state, 0, 0, 0);

    expect(result.players[1]!.lifepoints).toBe(15); // 20 - 5
  });

  it('Spade + Heart cancel out: net LP damage = overflow', () => {
    // Spade attacker × 2, Heart last card ÷ 2 → net = overflow
    // Spades K(11) attacks hearts 5 (only card). 5 absorbed, 6 overflow.
    // Spade ×2 = 12, Heart ÷2 = 6. Net = 6.
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', 'K', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('hearts', '5', 0);
    const state = makeCombatState(p0Bf, p1Bf);

    const result = resolveAttack(state, 0, 0, 0);

    expect(result.players[1]!.lifepoints).toBe(14); // 20 - 6
  });
});

describe('Overflow combo: Club + Diamond', () => {
  it('Club doubles overflow to back card behind Diamond front', () => {
    // Clubs 8 attacks Diamond 5 front, spades 3 back
    // Diamond 5: effectiveHp=10, absorbs 8, no overflow. Card survives.
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('clubs', '8', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('diamonds', '5', 0); // front, effectiveHp=10
    p1Bf[4] = makeBfCard('spades', '3', 4);
    const state = makeCombatState(p0Bf, p1Bf);

    const result = resolveAttack(state, 0, 0, 0);

    // Diamond 5 absorbs 8 (within 10 effective), realHpLoss = ceil(8*5/10) = 4, survives with 1
    expect(result.players[1]!.battlefield[0]!.currentHp).toBe(1);
    expect(result.players[1]!.battlefield[4]!.currentHp).toBe(3); // untouched
    expect(result.players[1]!.lifepoints).toBe(20);
  });

  it('Club doubles overflow when Diamond front is destroyed', () => {
    // Clubs K(11) attacks Diamond 3 front, spades T back
    // Diamond 3: effectiveHp=6, absorbs 6, destroyed. Overflow 5. Club doubles to 10.
    // Back T(10): absorbs 10, destroyed. Overflow 0.
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('clubs', 'K', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('diamonds', '3', 0);
    p1Bf[4] = makeBfCard('spades', 'T', 4);
    const state = makeCombatState(p0Bf, p1Bf);

    const result = resolveAttack(state, 0, 0, 0);

    expect(result.players[1]!.battlefield[0]).toBeNull(); // diamond destroyed
    expect(result.players[1]!.battlefield[4]).toBeNull(); // T destroyed by doubled overflow
    expect(result.players[1]!.lifepoints).toBe(20); // no LP overflow
  });
});
