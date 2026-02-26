import { describe, it, expect } from 'vitest';
import {
  STATE_MACHINE,
  GAME_PHASES,
  ACTION_PHASES,
  transitionsFrom,
  transitionsTo,
  findTransition,
} from '../src/state-machine.ts';
import { createInitialState, applyAction, validateAction } from '../src/index.ts';
import type {
  GameState,
  Card,
  Battlefield,
  PlayerState,
  BattlefieldCard,
  PartialCard,
} from '@phalanxduel/shared';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MOCK_TIMESTAMP = '2026-02-24T12:00:00.000Z';

function makeBfCard(
  suit: 'spades' | 'hearts' | 'diamonds' | 'clubs',
  value: number,
  face: string,
  gridIndex: number,
): BattlefieldCard {
  const row = gridIndex < 4 ? 0 : 1;
  const col = gridIndex % 4;
  return {
    card: {
      id: `test-${suit}-${face}`,
      suit,
      face,
      value,
      type: face === 'A' ? 'ace' : 'number',
    },
    position: { row, col },
    currentHp: value,
    faceDown: false,
  };
}

function emptyBf(): Battlefield {
  return [null, null, null, null, null, null, null, null] as Battlefield;
}

function makePlayer(
  id: string,
  name: string,
  bf: Battlefield,
  hand: Card[] = [],
  drawpile: PartialCard[] = [],
  lp = 20,
): PlayerState {
  return {
    player: { id, name },
    hand,
    battlefield: bf,
    drawpile,
    discardPile: [],
    lifepoints: lp,
    deckSeed: 0,
  };
}

function makeCombatState(
  p0Bf: Battlefield,
  p1Bf: Battlefield,
  opts?: {
    p0Hand?: Card[];
    p1Hand?: Card[];
    p0Drawpile?: PartialCard[];
    p1Drawpile?: PartialCard[];
    p0Lp?: number;
    p1Lp?: number;
  },
): GameState {
  return {
    matchId: '00000000-0000-0000-0000-000000000000',
    specVersion: '1.0',
    params: {
      specVersion: '1.0',
      classic: {
        enabled: true,
        mode: 'strict',
        battlefield: { rows: 2, columns: 4 },
        hand: { maxHandSize: 4 },
        start: { initialDraw: 12 },
        modes: {
          classicAces: true,
          classicFaceCards: true,
          damagePersistence: 'classic',
        },
        initiative: { deployFirst: 'P2', attackFirst: 'P1' },
        passRules: { maxConsecutivePasses: 3, maxTotalPassesPerPlayer: 5 },
      },
      rows: 2,
      columns: 4,
      maxHandSize: 4,
      initialDraw: 12,
      modeClassicAces: true,
      modeClassicFaceCards: true,
      modeDamagePersistence: 'classic',
      modeClassicDeployment: true,
      modeSpecialStart: { enabled: false },
      initiative: { deployFirst: 'P2', attackFirst: 'P1' },
      modePassRules: { maxConsecutivePasses: 3, maxTotalPassesPerPlayer: 5 },
    },
    players: [
      makePlayer(
        '00000000-0000-0000-0000-000000000001',
        'Alice',
        p0Bf,
        opts?.p0Hand ?? [],
        opts?.p0Drawpile ?? [{ suit: 'spades', face: 'A', value: 1, type: 'ace', id: 'd1' }],
        opts?.p0Lp ?? 20,
      ),
      makePlayer(
        '00000000-0000-0000-0000-000000000002',
        'Bob',
        p1Bf,
        opts?.p1Hand ?? [],
        opts?.p1Drawpile ?? [{ suit: 'spades', face: 'A', value: 1, type: 'ace', id: 'd2' }],
        opts?.p1Lp ?? 20,
      ),
    ],
    activePlayerIndex: 0,
    phase: 'AttackPhase',
    turnNumber: 1,
  };
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

  it('StartTurn exposes init, turn-advance, and post-turn victory transitions', () => {
    const setupTransitions = transitionsFrom('StartTurn');
    const edges = new Set(setupTransitions.map((t) => `${t.trigger}->${t.to}`));
    expect(edges.has('system:init->DeploymentPhase')).toBe(true);
    expect(edges.has('system:init->AttackPhase')).toBe(true);
    expect(edges.has('system:advance->AttackPhase')).toBe(true);
    expect(edges.has('system:victory->gameOver')).toBe(true);
  });

  it('gameOver has no outgoing transitions (terminal state)', () => {
    expect(transitionsFrom('gameOver')).toHaveLength(0);
  });

  it('gameOver is reachable from AttackPhase and ReinforcementPhase', () => {
    const inbound = transitionsTo('gameOver');
    const sources = new Set(inbound.map((t) => t.from));
    expect(sources.has('AttackPhase')).toBe(true);
    expect(sources.has('ReinforcementPhase')).toBe(true);
  });

  it('transitionsFrom and transitionsTo are inverses for each edge', () => {
    for (const t of STATE_MACHINE) {
      expect(transitionsFrom(t.from)).toContain(t);
      expect(transitionsTo(t.to)).toContain(t);
    }
  });

  it('findTransition returns the correct edge or undefined', () => {
    const t = findTransition('AttackPhase', 'pass');
    expect(t).toBeDefined();
    expect(t!.to).toBe('AttackResolution');

    const victory = findTransition('AttackResolution', 'attack:victory');
    expect(victory).toBeDefined();
    expect(victory!.to).toBe('gameOver');

    const missing = findTransition('gameOver', 'attack');
    expect(missing).toBeUndefined();
  });

  it('ACTION_PHASES excludes StartTurn and gameOver', () => {
    expect(ACTION_PHASES).not.toContain('StartTurn');
    expect(ACTION_PHASES).not.toContain('gameOver');
  });
});

// ---------------------------------------------------------------------------
// Edge: StartTurn → DeploymentPhase  (system:init)
// ---------------------------------------------------------------------------

describe('State machine edge: StartTurn → DeploymentPhase (system:init)', () => {
  it('createInitialState produces StartTurn phase', () => {
    const state = createInitialState({
      matchId: '00000000-0000-0000-0000-000000000000',
      players: [
        { id: '00000000-0000-0000-0000-000000000001', name: 'Alice' },
        { id: '00000000-0000-0000-0000-000000000002', name: 'Bob' },
      ],
      rngSeed: 1,
    });
    expect(state.phase).toBe('StartTurn');
  });

  it('system:init transitions classic mode to DeploymentPhase', () => {
    const initial = createInitialState({
      matchId: '00000000-0000-0000-0000-000000000000',
      players: [
        { id: '00000000-0000-0000-0000-000000000001', name: 'Alice' },
        { id: '00000000-0000-0000-0000-000000000002', name: 'Bob' },
      ],
      rngSeed: 1,
      gameOptions: { damageMode: 'classic', startingLifepoints: 20 },
    });
    const started = applyAction(initial, { type: 'system:init', timestamp: MOCK_TIMESTAMP });
    expect(started.phase).toBe('DeploymentPhase');
    expect(started.turnNumber).toBe(0);
  });

  it('system:init transitions cumulative mode to DeploymentPhase (regression: must not skip to AttackPhase)', () => {
    const initial = createInitialState({
      matchId: '00000000-0000-0000-0000-000000000000',
      players: [
        { id: '00000000-0000-0000-0000-000000000001', name: 'Alice' },
        { id: '00000000-0000-0000-0000-000000000002', name: 'Bob' },
      ],
      rngSeed: 1,
      gameOptions: { damageMode: 'cumulative', startingLifepoints: 200 },
    });
    const started = applyAction(initial, { type: 'system:init', timestamp: MOCK_TIMESTAMP });
    expect(started.phase).toBe('DeploymentPhase');
    expect(started.turnNumber).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Edge: AttackPhase → AttackResolution (attack)
// ---------------------------------------------------------------------------

describe('State machine edge: AttackPhase → AttackResolution (attack)', () => {
  it('attack action in AttackPhase transitions to resolution then cycles to next AttackPhase', () => {
    const p0Bf: Battlefield = [
      makeBfCard('spades', 5, '5', 0),
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    ];
    const p1Bf: Battlefield = [
      makeBfCard('hearts', 5, '5', 0),
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
      attackingColumn: 0,
      defendingColumn: 0,
      timestamp: MOCK_TIMESTAMP,
    });
    // applyAction handles the full cycle if no reinforcement
    expect(result.phase).toBe('AttackPhase');
    expect(result.activePlayerIndex).toBe(1);
    expect(result.turnNumber).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Edge: AttackPhase → AttackResolution (pass)
// ---------------------------------------------------------------------------

describe('State machine edge: AttackPhase → AttackResolution (pass)', () => {
  it('pass keeps turn moving and increments turnNumber', () => {
    const bf: Battlefield = [
      makeBfCard('spades', 5, '5', 0),
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    ];
    const state = makeCombatState(bf, bf);
    const result = applyAction(state, {
      type: 'pass',
      playerIndex: 0,
      timestamp: MOCK_TIMESTAMP,
    });
    expect(result.phase).toBe('AttackPhase');
    expect(result.activePlayerIndex).toBe(1);
    expect(result.turnNumber).toBe(2);

    const tx = result.transactionLog?.at(-1);
    expect(tx).toBeDefined();
    expect(tx?.phaseTrace).toEqual([
      { from: 'AttackPhase', trigger: 'pass', to: 'AttackResolution' },
      { from: 'AttackResolution', trigger: 'system:advance', to: 'CleanupPhase' },
      { from: 'CleanupPhase', trigger: 'system:advance', to: 'ReinforcementPhase' },
      { from: 'ReinforcementPhase', trigger: 'system:advance', to: 'DrawPhase' },
      { from: 'DrawPhase', trigger: 'system:advance', to: 'EndTurn' },
      { from: 'EndTurn', trigger: 'system:advance', to: 'StartTurn' },
      { from: 'StartTurn', trigger: 'system:advance', to: 'AttackPhase' },
    ]);
  });
});

// ---------------------------------------------------------------------------
// Edge: AttackPhase → ReinforcementPhase (attack:reinforcement)
// ---------------------------------------------------------------------------

describe('State machine edge: AttackPhase → ReinforcementPhase', () => {
  it('attack that destroys card triggers ReinforcementPhase when defender has hand', () => {
    // Alice attacks Bob's front card. Bob's card has 2 HP, Alice's has 11.
    const p0Bf: Battlefield = [
      makeBfCard('spades', 11, 'K', 0),
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    ];
    const p1Bf: Battlefield = [
      makeBfCard('clubs', 2, '2', 0),
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    ];
    const bobCard: Card = {
      id: 'bob-1',
      suit: 'hearts',
      face: '3',
      value: 3,
      type: 'number',
    };
    const state = makeCombatState(p0Bf, p1Bf, { p1Hand: [bobCard] });
    const result = applyAction(state, {
      type: 'attack',
      playerIndex: 0,
      attackingColumn: 0,
      defendingColumn: 0,
      timestamp: MOCK_TIMESTAMP,
    });
    expect(result.phase).toBe('ReinforcementPhase');
    expect(result.activePlayerIndex).toBe(1); // Bob's turn to reinforce
    expect(result.reinforcement).toBeDefined();
    expect(result.reinforcement!.column).toBe(0);
  });

  it('after reinforcement completes, defending player (Bob) gets the next attack turn (regression: attacker must not get a free second turn)', () => {
    // Alice (P0) attacks Bob's (P1) front card and destroys it.
    // Bob has a card in hand and reinforces.
    // After reinforcing Bob should be active (AttackPhase), not Alice.
    const p0Bf: Battlefield = [
      makeBfCard('spades', 11, 'K', 0),
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    ];
    const p1Bf: Battlefield = [
      makeBfCard('clubs', 2, '2', 0),
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    ];
    const bobReinforceCard: Card = {
      id: 'bob-reinforce-1',
      suit: 'diamonds',
      face: '5',
      value: 5,
      type: 'number',
    };
    const stateBeforeAttack = makeCombatState(p0Bf, p1Bf, { p1Hand: [bobReinforceCard] });

    // Alice attacks and destroys Bob's front card → ReinforcementPhase
    const afterAttack = applyAction(stateBeforeAttack, {
      type: 'attack',
      playerIndex: 0,
      attackingColumn: 0,
      defendingColumn: 0,
      timestamp: MOCK_TIMESTAMP,
    });
    expect(afterAttack.phase).toBe('ReinforcementPhase');
    expect(afterAttack.activePlayerIndex).toBe(1);

    // Bob reinforces with his card
    const afterReinforce = applyAction(afterAttack, {
      type: 'reinforce',
      playerIndex: 1,
      cardId: bobReinforceCard.id,
      timestamp: MOCK_TIMESTAMP,
    });

    // Bob (defender) should now be the active attacker, not Alice
    expect(afterReinforce.phase).toBe('AttackPhase');
    expect(afterReinforce.activePlayerIndex).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Edge: AttackPhase → gameOver (attack:victory)
// ---------------------------------------------------------------------------

describe('State machine edge: AttackPhase → gameOver (attack:victory)', () => {
  it('LP depletion producing gameOver', () => {
    const p0Bf: Battlefield = [
      makeBfCard('spades', 11, 'K', 0),
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    ];
    const p1Bf: Battlefield = [
      makeBfCard('clubs', 2, '2', 0),
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    ];
    // Bob has 1 LP — overflow 9 will exceed it
    const state = makeCombatState(p0Bf, p1Bf, { p1Lp: 1 });
    const result = applyAction(state, {
      type: 'attack',
      playerIndex: 0,
      attackingColumn: 0,
      defendingColumn: 0,
      timestamp: MOCK_TIMESTAMP,
    });
    expect(result.phase).toBe('gameOver');
    expect(result.outcome!.victoryType).toBe('lpDepletion');
  });
});

// ---------------------------------------------------------------------------
// Phase guards: invalid actions in wrong phases are rejected
// ---------------------------------------------------------------------------

describe('Phase guards: actions rejected in wrong phases', () => {
  it('any action by non-active player is rejected', () => {
    const bf = emptyBf();
    const state = makeCombatState(bf, bf); // activePlayerIndex: 0
    const result = validateAction(state, {
      type: 'pass',
      playerIndex: 1,
      timestamp: MOCK_TIMESTAMP,
    });
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/turn/);
  });
});

// ---------------------------------------------------------------------------
// Pass limit enforcement
// ---------------------------------------------------------------------------

describe('Pass limit enforcement', () => {
  it('consecutive pass limit triggers gameOver with passLimit victory (loser is the passer)', () => {
    // maxConsecutivePasses = 3 in makeCombatState params.
    // Players alternate: P0 pass, P1 pass, P0 pass, P1 pass, P0 pass → P0 hits 3 consecutive.
    const bf = emptyBf();
    let s = makeCombatState(bf, bf); // activePlayerIndex: 0, phase: AttackPhase
    s = applyAction(s, { type: 'pass', playerIndex: 0, timestamp: MOCK_TIMESTAMP }); // P0 consec=1
    expect(s.phase).toBe('AttackPhase');
    s = applyAction(s, { type: 'pass', playerIndex: 1, timestamp: MOCK_TIMESTAMP }); // P1 consec=1
    expect(s.phase).toBe('AttackPhase');
    s = applyAction(s, { type: 'pass', playerIndex: 0, timestamp: MOCK_TIMESTAMP }); // P0 consec=2
    expect(s.phase).toBe('AttackPhase');
    s = applyAction(s, { type: 'pass', playerIndex: 1, timestamp: MOCK_TIMESTAMP }); // P1 consec=2
    expect(s.phase).toBe('AttackPhase');
    s = applyAction(s, { type: 'pass', playerIndex: 0, timestamp: MOCK_TIMESTAMP }); // P0 consec=3 → limit
    expect(s.phase).toBe('gameOver');
    expect(s.outcome!.victoryType).toBe('passLimit');
    expect(s.outcome!.winnerIndex).toBe(1); // P1 wins; P0 exceeded their limit
  });

  it('total pass limit triggers gameOver with passLimit victory', () => {
    // maxTotalPassesPerPlayer = 5. Override maxConsecutivePasses to a high value
    // so only the total limit fires.
    const bf = emptyBf();
    const base = makeCombatState(bf, bf);
    let s: typeof base = {
      ...base,
      params: {
        ...base.params,
        modePassRules: { maxConsecutivePasses: 99, maxTotalPassesPerPlayer: 3 },
        classic: {
          ...base.params.classic,
          passRules: { maxConsecutivePasses: 99, maxTotalPassesPerPlayer: 3 },
        },
      },
    };
    // P0 passes 3 times total (P1 passes in between to keep alternating).
    s = applyAction(s, { type: 'pass', playerIndex: 0, timestamp: MOCK_TIMESTAMP }); // P0 total=1
    s = applyAction(s, { type: 'pass', playerIndex: 1, timestamp: MOCK_TIMESTAMP });
    s = applyAction(s, { type: 'pass', playerIndex: 0, timestamp: MOCK_TIMESTAMP }); // P0 total=2
    s = applyAction(s, { type: 'pass', playerIndex: 1, timestamp: MOCK_TIMESTAMP });
    s = applyAction(s, { type: 'pass', playerIndex: 0, timestamp: MOCK_TIMESTAMP }); // P0 total=3 → limit
    expect(s.phase).toBe('gameOver');
    expect(s.outcome!.victoryType).toBe('passLimit');
    expect(s.outcome!.winnerIndex).toBe(1);
  });

  it('attacking resets the consecutive pass counter so the limit is not triggered prematurely', () => {
    // P0 attacks with value 2 vs P1's 5-HP card: deals damage but does NOT destroy it.
    // This avoids triggering ReinforcementPhase (card not destroyed) or gameOver (P1 still has a card).
    const p0Bf: Battlefield = [
      makeBfCard('spades', 2, '2', 0),
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    ];
    const p1Bf: Battlefield = [
      makeBfCard('hearts', 5, '5', 0),
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    ];
    // Empty drawpiles prevent the DrawPhase (triggered after each pass) from adding
    // cards to players' hands, which would otherwise trigger ReinforcementPhase on attack.
    const base = makeCombatState(p0Bf, p1Bf, { p0Drawpile: [], p1Drawpile: [] });
    let s = base;

    // P0 passes twice (consecutive=2), then attacks (consecutive resets to 0).
    s = applyAction(s, { type: 'pass', playerIndex: 0, timestamp: MOCK_TIMESTAMP }); // P0 consec=1
    s = applyAction(s, { type: 'pass', playerIndex: 1, timestamp: MOCK_TIMESTAMP }); // P1 consec=1
    s = applyAction(s, { type: 'pass', playerIndex: 0, timestamp: MOCK_TIMESTAMP }); // P0 consec=2
    s = applyAction(s, { type: 'pass', playerIndex: 1, timestamp: MOCK_TIMESTAMP }); // P1 consec=2
    // P0 attacks instead of passing — should reset P0 consecutive to 0.
    s = applyAction(s, {
      type: 'attack',
      playerIndex: 0,
      attackingColumn: 0,
      defendingColumn: 0,
      timestamp: MOCK_TIMESTAMP,
    });
    expect(s.passState?.consecutivePasses[0]).toBe(0);
    // The game is still alive — the attack prevented P0 from hitting the limit.
    expect(s.phase).toBe('AttackPhase');
  });
});
