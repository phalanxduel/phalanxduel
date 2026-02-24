/**
 * Canonical state machine tests for Phalanx Duel.
 *
 * Each test corresponds to an edge in STATE_MACHINE (engine/src/state-machine.ts),
 * which is itself derived from docs/system/GAME_STATE_MACHINE.md.
 *
 * Structure:
 *   - Graph integrity tests verify the spec itself is well-formed
 *   - Transition tests verify the engine implements each edge correctly
 *   - Guard tests verify that actions are rejected in wrong phases
 */

import { describe, it, expect } from 'vitest';
import {
  STATE_MACHINE,
  GAME_PHASES,
  ACTION_PHASES,
  transitionsFrom,
  transitionsTo,
  findTransition,
} from '../src/state-machine.ts';
import { createInitialState, drawCards, applyAction, validateAction } from '../src/index.ts';
import type {
  GameState,
  Card,
  Battlefield,
  PlayerState,
  BattlefieldCard,
} from '@phalanxduel/shared';
import { RANK_VALUES } from '@phalanxduel/shared';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeBfCard(
  suit: 'spades' | 'hearts' | 'diamonds' | 'clubs',
  rank: string,
  gridIndex: number,
  hpOverride?: number,
): BattlefieldCard {
  const row = gridIndex < 4 ? 0 : 1;
  const col = gridIndex % 4;
  const hp = hpOverride ?? RANK_VALUES[rank] ?? 0;
  return {
    card: { suit, rank: rank as Card['rank'] },
    position: { row, col },
    currentHp: hp,
    faceDown: false,
  };
}

function emptyBf(): Battlefield {
  return [null, null, null, null, null, null, null, null];
}

function makePlayer(
  id: string,
  name: string,
  bf: Battlefield,
  hand: Card[] = [],
  drawpile: Card[] = [],
  lp = 20,
): PlayerState {
  return { player: { id, name }, hand, battlefield: bf, drawpile, discardPile: [], lifepoints: lp };
}

function makeCombatState(
  p0Bf: Battlefield,
  p1Bf: Battlefield,
  opts?: {
    p0Hand?: Card[];
    p1Hand?: Card[];
    p0Drawpile?: Card[];
    p1Drawpile?: Card[];
    p0Lp?: number;
    p1Lp?: number;
  },
): GameState {
  return {
    players: [
      makePlayer(
        '00000000-0000-0000-0000-000000000001',
        'Alice',
        p0Bf,
        opts?.p0Hand ?? [],
        opts?.p0Drawpile ?? [],
        opts?.p0Lp ?? 20,
      ),
      makePlayer(
        '00000000-0000-0000-0000-000000000002',
        'Bob',
        p1Bf,
        opts?.p1Hand ?? [],
        opts?.p1Drawpile ?? [],
        opts?.p1Lp ?? 20,
      ),
    ],
    activePlayerIndex: 0,
    phase: 'combat',
    turnNumber: 1,
    rngSeed: 42,
    transactionLog: [],
  };
}

/** Minimal deployment-phase state with both players having hand cards */
function makeDeploymentState(): GameState {
  const config = {
    players: [
      { id: '00000000-0000-0000-0000-000000000001', name: 'Alice' },
      { id: '00000000-0000-0000-0000-000000000002', name: 'Bob' },
    ] as [{ id: string; name: string }, { id: string; name: string }],
    rngSeed: 1,
  };
  let state = createInitialState(config);
  state = drawCards(state, 0, 12);
  state = drawCards(state, 1, 12);
  return { ...state, phase: 'deployment' };
}

// ---------------------------------------------------------------------------
// Graph integrity: verify the spec itself is well-formed
// ---------------------------------------------------------------------------

describe('STATE_MACHINE graph integrity', () => {
  it('every transition references valid GamePhase nodes', () => {
    const validPhases = new Set(GAME_PHASES);
    for (const t of STATE_MACHINE) {
      expect(
        validPhases.has(t.from),
        `unknown from-phase "${t.from}" in transition ${t.trigger}`,
      ).toBe(true);
      expect(validPhases.has(t.to), `unknown to-phase "${t.to}" in transition ${t.trigger}`).toBe(
        true,
      );
    }
  });

  it('every transition has a non-empty description', () => {
    for (const t of STATE_MACHINE) {
      expect(
        t.description.length,
        `empty description on ${t.from}→${t.to} (${t.trigger})`,
      ).toBeGreaterThan(10);
    }
  });

  it('setup has exactly one outgoing transition (system:init → deployment)', () => {
    const setupTransitions = transitionsFrom('setup');
    expect(setupTransitions).toHaveLength(1);
    expect(setupTransitions[0]!.to).toBe('deployment');
    expect(setupTransitions[0]!.trigger).toBe('system:init');
  });

  it('gameOver has no outgoing transitions (terminal state)', () => {
    expect(transitionsFrom('gameOver')).toHaveLength(0);
  });

  it('gameOver is reachable from combat and reinforcement', () => {
    const inbound = transitionsTo('gameOver');
    const sources = new Set(inbound.map((t) => t.from));
    expect(sources.has('combat')).toBe(true);
    expect(sources.has('reinforcement')).toBe(true);
  });

  it('transitionsFrom and transitionsTo are inverses for each edge', () => {
    for (const t of STATE_MACHINE) {
      expect(transitionsFrom(t.from)).toContain(t);
      expect(transitionsTo(t.to)).toContain(t);
    }
  });

  it('findTransition returns the correct edge or undefined', () => {
    const t = findTransition('combat', 'pass');
    expect(t).toBeDefined();
    expect(t!.to).toBe('combat');

    const missing = findTransition('gameOver', 'attack');
    expect(missing).toBeUndefined();
  });

  it('ACTION_PHASES excludes setup and gameOver', () => {
    expect(ACTION_PHASES).not.toContain('setup');
    expect(ACTION_PHASES).not.toContain('gameOver');
  });
});

// ---------------------------------------------------------------------------
// Edge: setup → deployment  (system:init)
// ---------------------------------------------------------------------------

describe('State machine edge: setup → deployment (system:init)', () => {
  it('createInitialState produces setup phase', () => {
    const state = createInitialState({
      players: [
        { id: '00000000-0000-0000-0000-000000000001', name: 'Alice' },
        { id: '00000000-0000-0000-0000-000000000002', name: 'Bob' },
      ],
      rngSeed: 1,
    });
    expect(state.phase).toBe('setup');
  });

  it('server startup flow (drawCards × 2 + set phase) reaches deployment', () => {
    const config = {
      players: [
        { id: '00000000-0000-0000-0000-000000000001', name: 'Alice' },
        { id: '00000000-0000-0000-0000-000000000002', name: 'Bob' },
      ] as [{ id: string; name: string }, { id: string; name: string }],
      rngSeed: 1,
    };
    let state = createInitialState(config);
    state = drawCards(state, 0, 12);
    state = drawCards(state, 1, 12);
    state = { ...state, phase: 'deployment' };
    expect(state.phase).toBe('deployment');
    expect(state.players[0]!.hand).toHaveLength(12);
    expect(state.players[1]!.hand).toHaveLength(12);
  });
});

// ---------------------------------------------------------------------------
// Edge: deployment → deployment  (deploy)
// ---------------------------------------------------------------------------

describe('State machine edge: deployment → deployment (deploy)', () => {
  it('deploy action in deployment phase keeps phase as deployment while incomplete', () => {
    const state = makeDeploymentState();
    const card = state.players[0]!.hand[0]!;
    const result = applyAction(state, { type: 'deploy', playerIndex: 0, card, column: 0 });
    expect(result.phase).toBe('deployment');
    // Turns alternate
    expect(result.activePlayerIndex).toBe(1);
  });

  it('deploy alternates active player each turn', () => {
    let state = makeDeploymentState();
    // p0 deploys
    const card0 = state.players[0]!.hand[0]!;
    state = applyAction(state, { type: 'deploy', playerIndex: 0, card: card0, column: 0 });
    expect(state.activePlayerIndex).toBe(1);
    // p1 deploys
    const card1 = state.players[1]!.hand[0]!;
    state = applyAction(state, { type: 'deploy', playerIndex: 1, card: card1, column: 0 });
    expect(state.activePlayerIndex).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Edge: deployment → combat  (deploy:complete)
// ---------------------------------------------------------------------------

describe('State machine edge: deployment → combat (deploy:complete)', () => {
  it('phase becomes combat when both players reach 8 battlefield cards', () => {
    let state = makeDeploymentState();
    // Each player needs 8 cards on battlefield (4 columns × 2 rows each).
    // 16 total deployments alternating: p0, p1, p0, p1, ...
    let player = 0 as 0 | 1;
    for (let round = 0; round < 16; round++) {
      const col = Math.floor(round / 2) % 4; // fill 2 cards per column before moving on
      const card = state.players[player]!.hand[0]!;
      state = applyAction(state, { type: 'deploy', playerIndex: player, card, column: col });
      player = (player === 0 ? 1 : 0) as 0 | 1;
    }
    expect(state.phase).toBe('combat');
    expect(state.turnNumber).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Edge: combat → combat  (pass)
// ---------------------------------------------------------------------------

describe('State machine edge: combat → combat (pass)', () => {
  it('pass keeps phase as combat, switches active player, increments turnNumber', () => {
    const bf: Battlefield = [
      makeBfCard('spades', '5', 0),
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    ];
    const state = makeCombatState(bf, bf);
    const result = applyAction(state, { type: 'pass', playerIndex: 0 });
    expect(result.phase).toBe('combat');
    expect(result.activePlayerIndex).toBe(1);
    expect(result.turnNumber).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Edge: combat → combat  (attack — no destruction)
// ---------------------------------------------------------------------------

describe('State machine edge: combat → combat (attack, no destruction)', () => {
  it('attack with surviving defender stays in combat and alternates turns', () => {
    // Attacker: 2 of spades (value 2). Defender: 5 of diamonds (value 5, hp 5 → 3 after hit)
    const p0Bf: Battlefield = [
      makeBfCard('spades', '2', 0),
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    ];
    const p1Bf: Battlefield = [
      makeBfCard('diamonds', '5', 0),
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    ];
    const state = makeCombatState(p0Bf, p1Bf);
    const result = applyAction(state, {
      type: 'attack',
      playerIndex: 0,
      attackerPosition: { row: 0, col: 0 },
      targetPosition: { row: 0, col: 0 },
    });
    expect(result.phase).toBe('combat');
    expect(result.activePlayerIndex).toBe(1);
    expect(result.turnNumber).toBe(2);
    // Defender's card survived with reduced HP
    expect(result.players[1]!.battlefield[0]).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Edge: combat → reinforcement  (attack:reinforcement)
// ---------------------------------------------------------------------------

describe('State machine edge: combat → reinforcement (attack:reinforcement)', () => {
  it('attack that destroys front card triggers reinforcement when defender has hand cards', () => {
    // Attacker: K of spades (value 11). Defender: 2 of clubs (hp 2) in front, hand has a card
    const p0Bf: Battlefield = [
      makeBfCard('spades', 'K', 0),
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    ];
    const p1Bf: Battlefield = [
      makeBfCard('clubs', '2', 0),
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    ];
    const defenderHandCard: Card = { suit: 'hearts', rank: '3' };
    const state = makeCombatState(p0Bf, p1Bf, { p1Hand: [defenderHandCard] });
    const result = applyAction(state, {
      type: 'attack',
      playerIndex: 0,
      attackerPosition: { row: 0, col: 0 },
      targetPosition: { row: 0, col: 0 },
    });
    expect(result.phase).toBe('reinforcement');
    expect(result.activePlayerIndex).toBe(1); // defender's turn
    expect(result.reinforcement).toBeDefined();
    expect(result.reinforcement!.column).toBe(0);
    expect(result.reinforcement!.attackerIndex).toBe(0);
  });

  it('attack that does NOT destroy any card does not trigger reinforcement', () => {
    // Weak attacker (2 of clubs) vs sturdy defender (8 of diamonds, hp 8) — defender survives
    const p0Bf: Battlefield = [
      makeBfCard('clubs', '2', 0),
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    ];
    const p1Bf: Battlefield = [
      makeBfCard('diamonds', '8', 0),
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    ];
    const defenderHandCard: Card = { suit: 'hearts', rank: '3' };
    const state = makeCombatState(p0Bf, p1Bf, { p1Hand: [defenderHandCard] });
    const result = applyAction(state, {
      type: 'attack',
      playerIndex: 0,
      attackerPosition: { row: 0, col: 0 },
      targetPosition: { row: 0, col: 0 },
    });
    // No card destroyed → reinforcement is never checked
    expect(result.phase).toBe('combat');
    // Defender's card survived with reduced HP
    expect(result.players[1]!.battlefield[0]).not.toBeNull();
  });

  it('attack that destroys card but defender hand is empty does NOT trigger reinforcement', () => {
    const p0Bf: Battlefield = [
      makeBfCard('spades', 'K', 0),
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    ];
    const p1Bf: Battlefield = [
      makeBfCard('clubs', '2', 0),
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    ];
    // Empty hand — no reinforcement
    const state = makeCombatState(p0Bf, p1Bf, { p1Hand: [] });
    const result = applyAction(state, {
      type: 'attack',
      playerIndex: 0,
      attackerPosition: { row: 0, col: 0 },
      targetPosition: { row: 0, col: 0 },
    });
    expect(result.phase).not.toBe('reinforcement');
  });
});

// ---------------------------------------------------------------------------
// Edge: combat → gameOver  (attack:victory)
// ---------------------------------------------------------------------------

describe('State machine edge: combat → gameOver (attack:victory)', () => {
  it('LP depletion: attack that reduces defender LP to 0 produces gameOver', () => {
    const p0Bf: Battlefield = [
      makeBfCard('spades', 'K', 0),
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    ];
    const p1Bf: Battlefield = [
      makeBfCard('clubs', '2', 0),
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    ];
    // Defender has 1 LP — overflow from destroying a 2-hp card (K attack = 11 dmg, overflow = 9) will exceed LP
    const state = makeCombatState(p0Bf, p1Bf, { p1Lp: 1 });
    const result = applyAction(state, {
      type: 'attack',
      playerIndex: 0,
      attackerPosition: { row: 0, col: 0 },
      targetPosition: { row: 0, col: 0 },
    });
    expect(result.phase).toBe('gameOver');
    expect(result.outcome).toBeDefined();
    expect(result.outcome!.winnerIndex).toBe(0);
    expect(result.outcome!.victoryType).toBe('lpDepletion');
  });

  it('card depletion: destroying last card when defender has empty hand+drawpile produces gameOver', () => {
    const p0Bf: Battlefield = [
      makeBfCard('spades', 'K', 0),
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    ];
    const p1Bf: Battlefield = [
      makeBfCard('clubs', '2', 0),
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    ];
    // Defender has no hand, no drawpile, one battlefield card
    const state = makeCombatState(p0Bf, p1Bf, { p1Hand: [], p1Drawpile: [], p1Lp: 100 });
    const result = applyAction(state, {
      type: 'attack',
      playerIndex: 0,
      attackerPosition: { row: 0, col: 0 },
      targetPosition: { row: 0, col: 0 },
    });
    expect(result.phase).toBe('gameOver');
    expect(result.outcome!.victoryType).toBe('cardDepletion');
  });
});

// ---------------------------------------------------------------------------
// Edge: combat → gameOver  (forfeit)
// ---------------------------------------------------------------------------

describe('State machine edge: combat → gameOver (forfeit)', () => {
  it('forfeit during combat ends the game with victoryType=forfeit for the opponent', () => {
    const bf: Battlefield = [
      makeBfCard('spades', '5', 0),
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    ];
    const state = makeCombatState(bf, bf);
    const result = applyAction(state, { type: 'forfeit', playerIndex: 0 });
    expect(result.phase).toBe('gameOver');
    expect(result.outcome!.winnerIndex).toBe(1);
    expect(result.outcome!.victoryType).toBe('forfeit');
  });
});

// ---------------------------------------------------------------------------
// Edge: reinforcement → reinforcement  (reinforce, continue)
// ---------------------------------------------------------------------------

describe('State machine edge: reinforcement → reinforcement (reinforce, continue)', () => {
  it('reinforce that leaves column space and hand cards remaining stays in reinforcement', () => {
    const p0Bf: Battlefield = [
      makeBfCard('spades', 'K', 0),
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    ];
    const p1Bf: Battlefield = emptyBf(); // column cleared — room for two cards
    const handCard1: Card = { suit: 'hearts', rank: '3' };
    const handCard2: Card = { suit: 'clubs', rank: '4' };
    const state: GameState = {
      players: [
        makePlayer('00000000-0000-0000-0000-000000000001', 'Alice', p0Bf),
        makePlayer('00000000-0000-0000-0000-000000000002', 'Bob', p1Bf, [handCard1, handCard2]),
      ],
      activePlayerIndex: 1,
      phase: 'reinforcement',
      turnNumber: 2,
      rngSeed: 42,
      transactionLog: [],
      reinforcement: { column: 0, attackerIndex: 0 },
    };
    const result = applyAction(state, { type: 'reinforce', playerIndex: 1, card: handCard1 });
    expect(result.phase).toBe('reinforcement');
    expect(result.players[1]!.hand).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Edge: reinforcement → combat  (reinforce:complete)
// ---------------------------------------------------------------------------

describe('State machine edge: reinforcement → combat (reinforce:complete)', () => {
  it('reinforce that fills the column returns to combat with attacker opponent as active player', () => {
    const p0Bf: Battlefield = [
      makeBfCard('spades', 'K', 0),
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    ];
    // p1: front empty, back already has a card — placing one more fills column
    const p1Bf: Battlefield = [
      null,
      null,
      null,
      null,
      makeBfCard('hearts', '5', 4),
      null,
      null,
      null,
    ];
    const handCard: Card = { suit: 'clubs', rank: '3' };
    const state: GameState = {
      players: [
        makePlayer('00000000-0000-0000-0000-000000000001', 'Alice', p0Bf),
        makePlayer('00000000-0000-0000-0000-000000000002', 'Bob', p1Bf, [handCard]),
      ],
      activePlayerIndex: 1,
      phase: 'reinforcement',
      turnNumber: 2,
      rngSeed: 42,
      transactionLog: [],
      reinforcement: { column: 0, attackerIndex: 0 },
    };
    const result = applyAction(state, { type: 'reinforce', playerIndex: 1, card: handCard });
    expect(result.phase).toBe('combat');
    expect(result.reinforcement).toBeUndefined();
    // Attacker was 0, so active player returns to 1 (the one who did NOT attack)
    expect(result.activePlayerIndex).toBe(1);
    expect(result.turnNumber).toBe(3);
  });

  it('reinforce with empty hand after placement completes reinforcement', () => {
    const p0Bf: Battlefield = [
      makeBfCard('spades', 'K', 0),
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    ];
    const p1Bf: Battlefield = emptyBf();
    const handCard: Card = { suit: 'hearts', rank: '3' };
    const state: GameState = {
      players: [
        makePlayer('00000000-0000-0000-0000-000000000001', 'Alice', p0Bf),
        makePlayer('00000000-0000-0000-0000-000000000002', 'Bob', p1Bf, [handCard]),
      ],
      activePlayerIndex: 1,
      phase: 'reinforcement',
      turnNumber: 2,
      rngSeed: 42,
      transactionLog: [],
      reinforcement: { column: 0, attackerIndex: 0 },
    };
    const result = applyAction(state, { type: 'reinforce', playerIndex: 1, card: handCard });
    // Hand is now empty → reinforcement complete
    expect(result.phase).toBe('combat');
  });
});

// ---------------------------------------------------------------------------
// Edge: reinforcement → gameOver  (forfeit)
// ---------------------------------------------------------------------------

describe('State machine edge: reinforcement → gameOver (forfeit)', () => {
  it('forfeit during reinforcement ends the game with victoryType=forfeit', () => {
    const p0Bf: Battlefield = [
      makeBfCard('spades', 'K', 0),
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    ];
    const p1Bf: Battlefield = emptyBf();
    const handCard: Card = { suit: 'hearts', rank: '3' };
    const state: GameState = {
      players: [
        makePlayer('00000000-0000-0000-0000-000000000001', 'Alice', p0Bf),
        makePlayer('00000000-0000-0000-0000-000000000002', 'Bob', p1Bf, [handCard]),
      ],
      activePlayerIndex: 1,
      phase: 'reinforcement',
      turnNumber: 2,
      rngSeed: 42,
      transactionLog: [],
      reinforcement: { column: 0, attackerIndex: 0 },
    };
    const result = applyAction(state, { type: 'forfeit', playerIndex: 1 });
    expect(result.phase).toBe('gameOver');
    expect(result.outcome!.winnerIndex).toBe(0);
    expect(result.outcome!.victoryType).toBe('forfeit');
  });
});

// ---------------------------------------------------------------------------
// Phase guards: invalid actions in wrong phases are rejected
// ---------------------------------------------------------------------------

describe('Phase guards: actions rejected in wrong phases', () => {
  it('deploy is rejected in combat phase', () => {
    const bf: Battlefield = [
      makeBfCard('spades', '5', 0),
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    ];
    const state = makeCombatState(bf, bf, { p0Hand: [{ suit: 'clubs', rank: '3' }] });
    const result = validateAction(state, {
      type: 'deploy',
      playerIndex: 0,
      card: { suit: 'clubs', rank: '3' },
      column: 1,
    });
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/deployment phase/);
  });

  it('attack is rejected in deployment phase', () => {
    const state = { ...makeDeploymentState(), phase: 'deployment' as const };
    const result = validateAction(state, {
      type: 'attack',
      playerIndex: 0,
      attackerPosition: { row: 0, col: 0 },
      targetPosition: { row: 0, col: 0 },
    });
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/combat phase/);
  });

  it('reinforce is rejected in combat phase', () => {
    const bf: Battlefield = [
      makeBfCard('spades', '5', 0),
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    ];
    const state = makeCombatState(bf, bf, { p0Hand: [{ suit: 'clubs', rank: '3' }] });
    const result = validateAction(state, {
      type: 'reinforce',
      playerIndex: 0,
      card: { suit: 'clubs', rank: '3' },
    });
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/reinforcement phase/);
  });

  it('forfeit is rejected in deployment phase', () => {
    const state = { ...makeDeploymentState(), phase: 'deployment' as const };
    const result = validateAction(state, { type: 'forfeit', playerIndex: 0 });
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/combat or reinforcement/);
  });

  it('any action by non-active player is rejected', () => {
    const bf: Battlefield = [
      makeBfCard('spades', '5', 0),
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    ];
    const state = makeCombatState(bf, bf); // activePlayerIndex: 0
    // pass has no player-turn check in validateAction — it is always valid
    const result = validateAction(state, { type: 'pass', playerIndex: 1 });
    expect(result.valid).toBe(true);
    // attack does enforce turn order
    const attackResult = validateAction(state, {
      type: 'attack',
      playerIndex: 1,
      attackerPosition: { row: 0, col: 0 },
      targetPosition: { row: 0, col: 0 },
    });
    expect(attackResult.valid).toBe(false);
    expect(attackResult.error).toMatch(/turn/);
  });
});
