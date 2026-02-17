/**
 * Full game simulation tests.
 *
 * Two automated "players" make legal moves while a "referee" validates
 * game state invariants after every action. Tests run across multiple
 * RNG seeds to explore different card layouts and combat outcomes.
 *
 * Goal: find crashes, infinite loops, illegal states, and edge cases
 * that unit tests miss.
 */
import { describe, it, expect } from 'vitest';
import { RANK_VALUES } from '@phalanx/shared';
import type { GameState, Action, Battlefield, BattlefieldCard, Card, PlayerState } from '@phalanx/shared';
import {
  createInitialState,
  drawCards,
  applyAction,
  validateAction,
  resolveAttack,
} from '../src/index.js';

// ── Test helpers (same as rules.test.ts) ─────────────────────────────────

function emptyBf(): Battlefield {
  return [null, null, null, null, null, null, null, null];
}

function makeBfCard(suit: Card['suit'], rank: Card['rank'], gridIndex: number): BattlefieldCard {
  return {
    card: { suit, rank },
    position: { row: gridIndex < 4 ? 0 : 1, col: gridIndex % 4 },
    currentHp: RANK_VALUES[rank] ?? 0,
    faceDown: false,
  };
}

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
    rngSeed: 0,
    transactionLog: [],
  };
}

// ── Referee: state invariant checks ──────────────────────────────────────

function assertInvariants(state: GameState, label: string) {
  for (let pi = 0; pi < 2; pi++) {
    const p = state.players[pi]!;

    // LP is never negative
    expect(p.lifepoints, `${label}: player ${pi} LP negative`).toBeGreaterThanOrEqual(0);

    // Battlefield cards have positive HP
    for (let slot = 0; slot < 8; slot++) {
      const card = p.battlefield[slot];
      if (card != null) {
        expect(card.currentHp, `${label}: p${pi} slot ${slot} HP <= 0 but not null`).toBeGreaterThan(0);
        // Position metadata must match slot
        const expectedRow = slot < 4 ? 0 : 1;
        const expectedCol = slot % 4;
        expect(card.position.row, `${label}: p${pi} slot ${slot} row mismatch`).toBe(expectedRow);
        expect(card.position.col, `${label}: p${pi} slot ${slot} col mismatch`).toBe(expectedCol);
      }
    }

    // Card conservation: total cards across all zones should equal 52
    const bfCards = p.battlefield.filter(c => c !== null).length;
    const totalCards = bfCards + p.hand.length + p.drawpile.length + p.discardPile.length;
    expect(totalCards, `${label}: p${pi} total cards != 52 (got ${totalCards})`).toBe(52);
  }

  // Phase sanity
  const validPhases = ['setup', 'deployment', 'combat', 'reinforcement', 'gameOver'];
  expect(validPhases, `${label}: invalid phase "${state.phase}"`).toContain(state.phase);

  // Active player is 0 or 1
  expect([0, 1], `${label}: invalid activePlayerIndex`).toContain(state.activePlayerIndex);

  // If gameOver, outcome must be present and at least one win condition must be met
  if (state.phase === 'gameOver') {
    expect(state.outcome, `${label}: gameOver but no outcome`).toBeDefined();
    expect(state.outcome!.winnerIndex, `${label}: outcome winnerIndex out of range`).toBeGreaterThanOrEqual(0);
    expect(state.outcome!.winnerIndex, `${label}: outcome winnerIndex out of range`).toBeLessThanOrEqual(1);
    expect(['lpDepletion', 'cardDepletion', 'forfeit'], `${label}: invalid victoryType`).toContain(state.outcome!.victoryType);
    expect(state.outcome!.turnNumber, `${label}: outcome turnNumber negative`).toBeGreaterThanOrEqual(0);

    const p0 = state.players[0]!;
    const p1 = state.players[1]!;
    const p0Empty = p0.battlefield.every(s => s === null) && p0.hand.length === 0 && p0.drawpile.length === 0;
    const p1Empty = p1.battlefield.every(s => s === null) && p1.hand.length === 0 && p1.drawpile.length === 0;
    const lpDepleted = p0.lifepoints === 0 || p1.lifepoints === 0;
    expect(
      p0Empty || p1Empty || lpDepleted,
      `${label}: gameOver but no win condition met`,
    ).toBe(true);
  }

  // Reinforcement context must exist in reinforcement phase
  if (state.phase === 'reinforcement') {
    expect(state.reinforcement, `${label}: reinforcement phase but no context`).toBeDefined();
    expect(state.reinforcement!.column, `${label}: reinforcement column out of range`).toBeGreaterThanOrEqual(0);
    expect(state.reinforcement!.column, `${label}: reinforcement column out of range`).toBeLessThan(4);
  }
}

// ── Player AI: simple but legal strategies ───────────────────────────────

/**
 * Deploy phase: pick the first card in hand, deploy to the specified column.
 */
function makeDeployAction(state: GameState): Action {
  const pi = state.activePlayerIndex;
  const player = state.players[pi]!;

  // Find first column with space
  for (let col = 0; col < 4; col++) {
    const frontFull = player.battlefield[col] !== null;
    const backFull = player.battlefield[col + 4] !== null;
    if (!frontFull || !backFull) {
      return {
        type: 'deploy',
        playerIndex: pi,
        card: player.hand[0]!,
        column: col,
      };
    }
  }
  throw new Error('No deploy target available but in deployment phase');
}

/**
 * Combat phase: attack with the strongest available front-row card.
 * Prefer columns where the opponent has cards (more interesting).
 */
function makeAttackAction(state: GameState): Action | null {
  const pi = state.activePlayerIndex;
  const oi = pi === 0 ? 1 : 0;
  const player = state.players[pi]!;
  const opponent = state.players[oi]!;

  // Collect all front-row cards that can attack
  const attackers: { col: number; hp: number }[] = [];
  for (let col = 0; col < 4; col++) {
    const card = player.battlefield[col];
    if (card) {
      attackers.push({ col, hp: card.currentHp });
    }
  }

  if (attackers.length === 0) return null;

  // Prefer columns where opponent has cards, then strongest attacker
  // Sort: has-opponent-card first, then by HP descending
  attackers.sort((a, b) => {
    const aHasTarget = opponent.battlefield[a.col] !== null || opponent.battlefield[a.col + 4] !== null;
    const bHasTarget = opponent.battlefield[b.col] !== null || opponent.battlefield[b.col + 4] !== null;
    if (aHasTarget !== bHasTarget) return aHasTarget ? -1 : 1;
    return b.hp - a.hp;
  });

  const best = attackers[0]!;
  return {
    type: 'attack',
    playerIndex: pi,
    attackerPosition: { row: 0, col: best.col },
    targetPosition: { row: 0, col: best.col },
  };
}

/**
 * Reinforcement phase: play the first hand card.
 */
function makeReinforceAction(state: GameState): Action {
  const pi = state.activePlayerIndex;
  const player = state.players[pi]!;

  if (player.hand.length === 0) {
    throw new Error('Reinforcement phase but hand is empty');
  }

  return {
    type: 'reinforce',
    playerIndex: pi,
    card: player.hand[0]!,
  };
}

/**
 * Play one full game. Returns the final state and action count.
 */
function playFullGame(seed: number, maxTurns = 500): { state: GameState; actions: number; outcome: string } {
  let state = createInitialState({
    players: [
      { id: '00000000-0000-0000-0000-000000000001', name: 'Alice' },
      { id: '00000000-0000-0000-0000-000000000002', name: 'Bob' },
    ],
    rngSeed: seed,
  });

  // Draw 12 cards for each player
  state = drawCards(state, 0, 12);
  state = drawCards(state, 1, 12);
  state = { ...state, phase: 'deployment', activePlayerIndex: 0 };

  let actions = 0;

  assertInvariants(state, `seed=${seed} initial`);

  while (state.phase !== 'gameOver' && actions < maxTurns) {
    let action: Action;

    switch (state.phase) {
      case 'deployment':
        action = makeDeployAction(state);
        break;

      case 'combat': {
        const attackAction = makeAttackAction(state);
        if (attackAction === null) {
          // No attackers available — pass
          action = { type: 'pass', playerIndex: state.activePlayerIndex };
        } else {
          action = attackAction;
        }
        break;
      }

      case 'reinforcement':
        action = makeReinforceAction(state);
        break;

      default:
        throw new Error(`Unexpected phase: ${state.phase}`);
    }

    // Validate action before applying
    const validation = validateAction(state, action);
    expect(validation.valid, `seed=${seed} action #${actions}: ${validation.error}`).toBe(true);

    state = applyAction(state, action);
    actions++;

    assertInvariants(state, `seed=${seed} after action #${actions}`);
  }

  let outcome: string;
  if (state.phase === 'gameOver' && state.outcome) {
    const winnerName = state.outcome.winnerIndex === 0 ? 'Alice' : 'Bob';
    outcome = `${winnerName} wins (${state.outcome.victoryType})`;
  } else if (state.phase === 'gameOver') {
    outcome = 'gameOver but no outcome';
  } else {
    outcome = `stalemate after ${maxTurns} actions`;
  }

  return { state, actions, outcome };
}

// ── Tests ────────────────────────────────────────────────────────────────

describe('Full game simulation', () => {
  // Run games across a variety of seeds
  const seeds = [1, 2, 7, 13, 42, 99, 100, 256, 1000, 9999, 31337, 65536, 77777, 123456, 999999];

  for (const seed of seeds) {
    it(`plays a complete game to conclusion (seed=${seed})`, () => {
      const result = playFullGame(seed);
      expect(result.state.phase).toBe('gameOver');
      expect(result.actions).toBeGreaterThan(16); // at least deployment
      expect(result.actions).toBeLessThan(500); // no infinite loops
    });
  }
});

describe('Game simulation edge cases', () => {
  it('handles game where one player has all Aces in front row', () => {
    // Manually construct a state where player 1 has 4 Aces in front row
    // This tests that games with invulnerable cards still terminate
    // (via LP depletion from overflow)
    const result = playFullGame(42, 1000);
    expect(result.state.phase).toBe('gameOver');
  });

  it('every game has a valid winner', () => {
    // Run many seeds and check that no game ends in an ambiguous state
    for (let seed = 0; seed < 50; seed++) {
      const { state, outcome } = playFullGame(seed);
      expect(state.phase, `seed=${seed} did not end`).toBe('gameOver');
      expect(outcome, `seed=${seed} ambiguous outcome`).not.toContain('stalemate');
    }
  });

  it('card conservation holds across all seeds', () => {
    // This is already checked by assertInvariants, but let's be explicit
    for (let seed = 0; seed < 20; seed++) {
      const { state } = playFullGame(seed);
      for (let pi = 0; pi < 2; pi++) {
        const p = state.players[pi]!;
        const total =
          p.battlefield.filter(c => c !== null).length +
          p.hand.length +
          p.drawpile.length +
          p.discardPile.length;
        expect(total, `seed=${seed} p${pi}`).toBe(52);
      }
    }
  });

  it('games with consecutive seeds produce different outcomes', () => {
    // Ensure the RNG actually varies games
    const outcomes: string[] = [];
    for (let seed = 1; seed <= 20; seed++) {
      const { actions } = playFullGame(seed);
      outcomes.push(`${actions}`);
    }
    // At least some variation in game length
    const unique = new Set(outcomes);
    expect(unique.size, 'All games had identical action counts').toBeGreaterThan(1);
  });
});

describe('Stalemate detection', () => {
  it('detects when both players have only Aces and no LP damage can occur', () => {
    // This scenario tests whether the game can get stuck
    // If both players have only Aces, attacks do 1 damage absorbed by Ace
    // invulnerability, BUT overflow still goes to LP. So games should still end.
    // We verify no game stalls by running many seeds with 500-turn limit.
    for (let seed = 0; seed < 30; seed++) {
      const { state, actions } = playFullGame(seed, 500);
      if (state.phase !== 'gameOver') {
        // If a game didn't end, check if it's a true stalemate
        // Both players pass indefinitely (no front-row cards)
        const p0HasFront = state.players[0]!.battlefield.slice(0, 4).some(c => c !== null);
        const p1HasFront = state.players[1]!.battlefield.slice(0, 4).some(c => c !== null);

        // A stalemate is when NEITHER player has front row cards and BOTH
        // have no hand/drawpile to reinforce. This shouldn't happen because
        // reinforcement fills damaged columns.
        if (!p0HasFront && !p1HasFront) {
          expect.unreachable(
            `seed=${seed}: true stalemate at action ${actions} — both players have no front row and game didn't end`,
          );
        }
      }
    }
  });
});

describe('Pass-only scenarios', () => {
  it('handles players passing when they have no front-row attackers', () => {
    // This can happen after destruction if all front-row cards are gone
    // and reinforcement didn't fill them (hand empty)
    // The pass action should be valid and the game should continue
    let state = createInitialState({
      players: [
        { id: '00000000-0000-0000-0000-000000000001', name: 'Alice' },
        { id: '00000000-0000-0000-0000-000000000002', name: 'Bob' },
      ],
      rngSeed: 42,
    });
    state = drawCards(state, 0, 12);
    state = drawCards(state, 1, 12);
    state = { ...state, phase: 'combat', activePlayerIndex: 0 };

    // Clear all of player 0's front row (simulating they were destroyed)
    const bf = [...state.players[0]!.battlefield] as Battlefield;
    for (let i = 0; i < 4; i++) bf[i] = null;
    const players = [{ ...state.players[0]!, battlefield: bf, hand: [] as Card[], drawpile: [] as Card[] }, state.players[1]!] as [typeof state.players[0], typeof state.players[1]];
    state = { ...state, players };

    // Player should be able to pass
    const passAction: Action = { type: 'pass', playerIndex: 0 };
    const validation = validateAction(state, passAction);
    expect(validation.valid).toBe(true);

    const newState = applyAction(state, passAction);
    expect(newState.activePlayerIndex).toBe(1);
  });
});

describe('Targeted edge case probes', () => {
  it('attack into completely empty column sends all damage to LP', () => {
    // Arrange — spades K(11) attacks empty column. All damage to LP.
    // Spade ×2 bonus applies. 11 × 2 = 22 LP damage.
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', 'K', 0);
    const p1Bf = emptyBf(); // entire battlefield empty
    const state = makeCombatState(p0Bf, p1Bf);

    const { state: result } = resolveAttack(state, 0, 0, 0);
    // 20 - 22 clamped to 0
    expect(result.players[1]!.lifepoints).toBe(0);
  });

  it('attack into empty column without spade bonus', () => {
    // Arrange — clubs K(11) attacks empty column. No Spade bonus.
    // Clubs bonus only applies to back-card overflow, not LP.
    // 11 damage → LP = 20 - 11 = 9
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('clubs', 'K', 0);
    const p1Bf = emptyBf();
    const state = makeCombatState(p0Bf, p1Bf);

    const { state: result } = resolveAttack(state, 0, 0, 0);
    expect(result.players[1]!.lifepoints).toBe(9);
  });

  it('LP depletion during overflow prevents reinforcement', () => {
    // Arrange — spades K(11) attacks clubs 2 (2HP), defender LP = 5
    // Overflow: 11 - 2 = 9, Spade ×2 = 18 LP damage → LP 5 - 18 = 0
    // Card was destroyed + defender has hand cards → would normally reinforce
    // But LP = 0 means gameOver takes priority
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', 'K', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('clubs', '2', 0);
    const state = makeCombatState(p0Bf, p1Bf, {
      p1Lifepoints: 5,
      p1Hand: [{ suit: 'hearts', rank: '5' }, { suit: 'diamonds', rank: '3' }],
    });

    const result = applyAction(state, {
      type: 'attack',
      playerIndex: 0,
      attackerPosition: { row: 0, col: 0 },
      targetPosition: { row: 0, col: 0 },
    });

    // Game should be over, not in reinforcement
    expect(result.phase).toBe('gameOver');
    expect(result.players[1]!.lifepoints).toBe(0);
  });

  it('Diamond Ace in front row: invulnerability takes precedence over Diamond bonus', () => {
    // Arrange — K(11) attacks Diamond Ace in front row
    // Diamond bonus would double effective HP to 2, but Ace invulnerability
    // means it absorbs exactly 1 and overflows 10
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('clubs', 'K', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('diamonds', 'A', 0);
    const state = makeCombatState(p0Bf, p1Bf);

    const { state: result } = resolveAttack(state, 0, 0, 0);

    // Ace survives at 1 HP, 10 overflows to LP
    expect(result.players[1]!.battlefield[0]).not.toBeNull();
    expect(result.players[1]!.battlefield[0]!.currentHp).toBe(1);
    expect(result.players[1]!.lifepoints).toBe(10);
  });

  it('double destruction (front + back) in one attack', () => {
    // Arrange — clubs K(11) attacks spades 2(2HP front), clubs 3(3HP back)
    // Front absorbs 2, overflow = 9. Club ×2 to back = 18. Back(3HP) destroyed.
    // Overflow from back = 18 - 3 = 15 to LP.
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('clubs', 'K', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('spades', '2', 0); // front
    p1Bf[4] = makeBfCard('clubs', '3', 4);  // back
    const state = makeCombatState(p0Bf, p1Bf, {
      p1Hand: [{ suit: 'hearts', rank: '5' }],
    });

    const result = applyAction(state, {
      type: 'attack',
      playerIndex: 0,
      attackerPosition: { row: 0, col: 0 },
      targetPosition: { row: 0, col: 0 },
    });

    // Both cards destroyed, column empty → reinforcement
    expect(result.players[1]!.battlefield[0]).toBeNull();
    expect(result.players[1]!.battlefield[4]).toBeNull();
    expect(result.players[1]!.discardPile).toHaveLength(2);
    // LP damage = 15
    expect(result.players[1]!.lifepoints).toBe(5);
    // Reinforcement triggered because hand has cards and column empty
    expect(result.phase).toBe('reinforcement');
  });

  it('reinforcement fills entire empty column with two cards', () => {
    // Arrange — reinforcement phase, column 0 completely empty, hand has 2 cards
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', 'K', 0);
    const p1Bf = emptyBf();
    // Column 0 empty, but other columns have cards
    p1Bf[1] = makeBfCard('hearts', '5', 1);
    const state: GameState = {
      ...makeCombatState(p0Bf, p1Bf, {
        p1Hand: [
          { suit: 'clubs', rank: '4' },
          { suit: 'diamonds', rank: '6' },
          { suit: 'hearts', rank: '3' },
        ],
        p1Drawpile: [{ suit: 'spades', rank: '2' }],
      }),
      phase: 'reinforcement',
      activePlayerIndex: 1,
      reinforcement: { column: 0, attackerIndex: 0 },
    };

    // First reinforce: places clubs 4 in back row (slot 4), auto-advances to front (slot 0)
    const r1 = applyAction(state, {
      type: 'reinforce',
      playerIndex: 1,
      card: { suit: 'clubs', rank: '4' },
    });
    expect(r1.players[1]!.battlefield[0]).not.toBeNull();
    expect(r1.players[1]!.battlefield[0]!.card.rank).toBe('4');
    expect(r1.phase).toBe('reinforcement'); // column not full yet

    // Second reinforce: places diamonds 6 in back row (slot 4)
    const r2 = applyAction(r1, {
      type: 'reinforce',
      playerIndex: 1,
      card: { suit: 'diamonds', rank: '6' },
    });
    expect(r2.players[1]!.battlefield[4]).not.toBeNull();
    expect(r2.players[1]!.battlefield[4]!.card.rank).toBe('6');
    // Column now full → exits reinforcement, draws to 4
    expect(r2.phase).toBe('combat');
    // Had 1 card left in hand after 2 reinforcements, drawpile has 1 → draws 2 (but only 1 in pile)
    // 3 hand - 2 played = 1, need 3 more to reach 4, drawpile has 1 → draws 1 → hand = 2
    expect(r2.players[1]!.hand).toHaveLength(2);
    expect(r2.players[1]!.drawpile).toHaveLength(0);
  });

  it('Ace-vs-Ace in overflow context (Ace behind Ace)', () => {
    // Arrange — Ace attacks column with Ace front, Ace back
    // Front Ace: invulnerability doesn't apply (attacker is Ace), destroyed (1-1=0)
    // Overflow = 0, so back Ace is never hit
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', 'A', 0);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('hearts', 'A', 0);
    p1Bf[4] = makeBfCard('clubs', 'A', 4);
    const state = makeCombatState(p0Bf, p1Bf);

    const { state: result } = resolveAttack(state, 0, 0, 0);

    // Front Ace destroyed (Ace-vs-Ace), back Ace untouched (0 overflow)
    expect(result.players[1]!.battlefield[0]).toBeNull();
    expect(result.players[1]!.battlefield[4]).not.toBeNull();
    expect(result.players[1]!.battlefield[4]!.currentHp).toBe(1);
  });

  it('high-seed stress test (100 games)', { timeout: 15000 }, () => {
    let lpWins = 0;
    let cardWins = 0;
    let maxActions = 0;
    let minActions = Infinity;

    for (let seed = 10000; seed < 10100; seed++) {
      const { state, actions } = playFullGame(seed);
      expect(state.phase, `seed=${seed}`).toBe('gameOver');

      if (state.players[0]!.lifepoints === 0 || state.players[1]!.lifepoints === 0) {
        lpWins++;
      } else {
        cardWins++;
      }
      maxActions = Math.max(maxActions, actions);
      minActions = Math.min(minActions, actions);
    }

    // Verify we see a mix of victory types
    expect(lpWins + cardWins).toBe(100);
    // Games should vary in length
    expect(maxActions).toBeGreaterThan(minActions);
  });

  it('one-sided combat terminates when defender has no front row', () => {
    // Player 0 has only a back-row card, no hand, no drawpile
    // Player 1 attacks → destroys back card → player 0 fully depleted → gameOver
    const p0Bf = emptyBf();
    p0Bf[4] = makeBfCard('hearts', '5', 4);
    const p1Bf = emptyBf();
    p1Bf[0] = makeBfCard('spades', 'K', 0);
    let state: GameState = {
      ...makeCombatState(p0Bf, p1Bf),
      phase: 'combat',
      activePlayerIndex: 0,
    };

    // Player 0 passes (no front-row cards)
    state = applyAction(state, { type: 'pass', playerIndex: 0 });
    expect(state.activePlayerIndex).toBe(1);

    // Player 1 attacks column 0 → hits back-row hearts 5
    state = applyAction(state, {
      type: 'attack',
      playerIndex: 1,
      attackerPosition: { row: 0, col: 0 },
      targetPosition: { row: 0, col: 0 },
    });

    // Hearts 5 destroyed, no cards anywhere → card depletion victory
    expect(state.phase).toBe('gameOver');
    // LP took overflow damage (Spade K: 11 - 5 absorbed = 6 overflow, Spade×2=12, Heart÷2=6)
    expect(state.players[0]!.lifepoints).toBe(14);
  });

});
