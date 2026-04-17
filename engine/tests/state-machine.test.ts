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
  BattlefieldCard,
  PartialCard,
  PhaseHopTrace,
} from '@phalanxduel/shared';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MOCK_TIMESTAMP = '2026-03-20T12:00:00.000Z';
const INIT_TS = '2026-01-01T00:00:00.000Z';

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

function getBfCard(
  suit: 'spades' | 'hearts' | 'diamonds' | 'clubs',
  value: number,
  face: string,
): Card {
  return {
    id: `c-${suit}-${face}`,
    suit,
    face,
    value,
    type: face === 'A' ? 'ace' : 'number',
  };
}

function emptyBf(): Battlefield {
  return [null, null, null, null, null, null, null, null] as Battlefield;
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
  let state = createInitialState({
    matchId: '00000000-0000-0000-0000-000000000000',
    players: [
      { id: '00000000-0000-0000-0000-000000000001', name: 'Alice' },
      { id: '00000000-0000-0000-0000-000000000002', name: 'Bob' },
    ],
    rngSeed: 0,
    gameOptions: { classicDeployment: false },
  });

  state = applyAction(
    state,
    { type: 'system:init', timestamp: INIT_TS },
    { allowSystemInit: true },
  );

  state.players[0].battlefield = p0Bf;
  state.players[1].battlefield = p1Bf;
  if (opts?.p0Hand) state.players[0].hand = opts.p0Hand;
  if (opts?.p1Hand) state.players[1].hand = opts.p1Hand;
  if (opts?.p0Drawpile) state.players[0].drawpile = opts.p0Drawpile;
  if (opts?.p1Drawpile) state.players[1].drawpile = opts.p1Drawpile;
  if (opts?.p0Lp !== undefined) state.players[0].lifepoints = opts.p0Lp;
  if (opts?.p1Lp !== undefined) state.players[1].lifepoints = opts.p1Lp;

  return state;
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

  it('gameOver is reachable from every non-terminal phase via forfeit', () => {
    const inbound = transitionsTo('gameOver');
    const forfeitSources = new Set(
      inbound.filter((t) => t.trigger === 'forfeit').map((t) => t.from),
    );

    GAME_PHASES.forEach((phase) => {
      if (phase !== 'gameOver') {
        expect(
          forfeitSources.has(phase),
          `phase ${phase} is missing a forfeit transition to gameOver`,
        ).toBe(true);
      }
    });
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
// Transition Coverage: Verify 100% of STATE_MACHINE is reachable
// ---------------------------------------------------------------------------

describe('STATE_MACHINE implementation coverage', () => {
  it('exercises every declared transition in STATE_MACHINE', () => {
    const coveredTransitions = new Set<string>();

    const track = (state: GameState) => {
      const lastTx = state.transactionLog?.at(-1);
      if (lastTx) {
        lastTx.phaseTrace.forEach((hop: PhaseHopTrace) => {
          coveredTransitions.add(`${hop.from}|${hop.trigger}|${hop.to}`);
        });
      }
    };

    // 1. Initial State & Start
    let state = createInitialState({
      matchId: '00000000-0000-0000-0000-000000000000',
      players: [
        { id: 'p1', name: 'A' },
        { id: 'p2', name: 'B' },
      ],
      rngSeed: 1,
    });

    state = applyAction(
      state,
      { type: 'system:init', timestamp: MOCK_TIMESTAMP },
      { allowSystemInit: true },
    );
    track(state);

    let quickStartState = createInitialState({
      matchId: '00000000-0000-0000-0000-000000000111',
      players: [
        { id: 'p1', name: 'A' },
        { id: 'p2', name: 'B' },
      ],
      rngSeed: 1,
      gameOptions: {
        damageMode: 'classic',
        startingLifepoints: 20,
        classicDeployment: true,
        quickStart: true,
      },
    });

    quickStartState = applyAction(
      quickStartState,
      { type: 'system:init', timestamp: MOCK_TIMESTAMP },
      { allowSystemInit: true },
    );
    track(quickStartState);

    // 2. Deployment
    const rows = state.params.rows;
    const cols = state.params.columns;
    const totalSlots = rows * cols * 2;
    for (let i = 0; i < totalSlots; i++) {
      const activeIdx = state.activePlayerIndex;
      const card = state.players[activeIdx].hand[0];
      let col = 0;
      for (let c = 0; c < cols; c++) {
        if (
          state.players[activeIdx].battlefield[c] === null ||
          state.players[activeIdx].battlefield[c + cols] === null
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
      track(state);
    }

    // 3. Attack & various scenarios

    // Forfeit in AttackPhase (use a clone)
    track(
      applyAction(JSON.parse(JSON.stringify(state)), {
        type: 'forfeit',
        playerIndex: state.activePlayerIndex,
        timestamp: MOCK_TIMESTAMP,
      }),
    );

    // Pass
    state = applyAction(state, {
      type: 'pass',
      playerIndex: state.activePlayerIndex,
      timestamp: MOCK_TIMESTAMP,
    });
    track(state);

    // Attack producing resolution -> cleanup -> reinforcement -> draw -> end -> start -> attack
    let activeAtk = state.activePlayerIndex;
    let defenderIdx = activeAtk === 0 ? 1 : 0;

    state.players[defenderIdx].battlefield[0] = {
      card: getBfCard('hearts', 2, '2'),
      position: { row: 0, col: 0 },
      currentHp: 2,
      faceDown: false,
    };
    state.players[activeAtk].battlefield[0] = {
      card: getBfCard('spades', 10, '10'),
      position: { row: 0, col: 0 },
      currentHp: 10,
      faceDown: false,
    };
    state.players[defenderIdx].hand = [getBfCard('hearts', 5, '5')];

    state = applyAction(state, {
      type: 'attack',
      playerIndex: activeAtk,
      attackingColumn: 0,
      defendingColumn: 0,
      timestamp: MOCK_TIMESTAMP,
    });
    track(state);
    expect(state.phase).toBe('ReinforcementPhase');

    // Reinforce
    state = applyAction(state, {
      type: 'reinforce',
      playerIndex: state.activePlayerIndex,
      cardId: state.players[state.activePlayerIndex].hand[0].id,
      timestamp: MOCK_TIMESTAMP,
    });
    track(state);

    // Reinforcement Phase -> Draw Phase via PASS
    // Reset to a state that triggers reinforcement
    state = createInitialState({
      matchId: '00000000-0000-0000-0000-000000000000',
      players: [
        { id: 'p1', name: 'A' },
        { id: 'p2', name: 'B' },
      ],
      rngSeed: 1,
      gameOptions: { classicDeployment: false },
    });
    state = applyAction(
      state,
      { type: 'system:init', timestamp: INIT_TS },
      { allowSystemInit: true },
    );

    state.players[1].battlefield[0] = makeBfCard('hearts', 2, '2', 0);
    state.players[0].battlefield[0] = makeBfCard('spades', 5, '5', 0);
    state.players[1].hand = [getBfCard('diamonds', 5, '5')];

    state = applyAction(state, {
      type: 'attack',
      playerIndex: 0,
      attackingColumn: 0,
      defendingColumn: 0,
      timestamp: MOCK_TIMESTAMP,
    });
    expect(state.phase).toBe('ReinforcementPhase');
    // Defender passes instead of reinforcing
    state = applyAction(state, {
      type: 'pass',
      playerIndex: 1,
      timestamp: MOCK_TIMESTAMP,
    });
    track(state);
    // applyAction for 'pass' in ReinforcementPhase automatically transitions
    // through DrawPhase -> EndTurn -> StartTurn -> AttackPhase.
    expect(state.phase).toBe('AttackPhase');

    // Attack producing victory
    activeAtk = state.activePlayerIndex;
    defenderIdx = activeAtk === 0 ? 1 : 0;
    state.players[defenderIdx].lifepoints = 1;
    state.players[defenderIdx].battlefield = [null, null, null, null, null, null, null, null];
    state.players[defenderIdx].hand = [];
    state.players[defenderIdx].drawpile = [];
    state.players[activeAtk].battlefield[0] = {
      card: getBfCard('spades', 10, '10'),
      position: { row: 0, col: 0 },
      currentHp: 10,
      faceDown: false,
    };
    state = applyAction(state, {
      type: 'attack',
      playerIndex: activeAtk,
      attackingColumn: 0,
      defendingColumn: 0,
      timestamp: MOCK_TIMESTAMP,
    });
    track(state);
    expect(state.phase).toBe('gameOver');

    // 4. Special Init (Deployment Disabled)
    const stateNoDeploy = createInitialState({
      matchId: '00000000-0000-0000-0000-000000000000',
      players: [
        { id: 'p1', name: 'A' },
        { id: 'p2', name: 'B' },
      ],
      rngSeed: 1,
      gameOptions: { classicDeployment: false },
    });
    const sNoDeploy = applyAction(
      stateNoDeploy,
      { type: 'system:init', timestamp: MOCK_TIMESTAMP },
      { allowSystemInit: true },
    );
    track(sNoDeploy);

    // Cover redundant system:init from various phases
    track(
      applyAction(
        sNoDeploy,
        { type: 'system:init', timestamp: MOCK_TIMESTAMP },
        { allowSystemInit: true },
      ),
    ); // from AttackPhase

    let sDeploy = createInitialState({
      matchId: '00000000-0000-0000-0000-000000000000',
      players: [
        { id: 'p1', name: 'A' },
        { id: 'p2', name: 'B' },
      ],
      rngSeed: 1,
    });
    sDeploy = applyAction(
      sDeploy,
      { type: 'system:init', timestamp: MOCK_TIMESTAMP },
      { allowSystemInit: true },
    );
    track(
      applyAction(
        sDeploy,
        { type: 'system:init', timestamp: MOCK_TIMESTAMP },
        { allowSystemInit: true },
      ),
    ); // from DeploymentPhase

    let sReinforce = createInitialState({
      matchId: '00000000-0000-0000-0000-000000000000',
      players: [
        { id: 'p1', name: 'A' },
        { id: 'p2', name: 'B' },
      ],
      rngSeed: 1,
      gameOptions: { classicDeployment: false },
    });
    sReinforce = applyAction(
      sReinforce,
      { type: 'system:init', timestamp: INIT_TS },
      { allowSystemInit: true },
    );
    sReinforce.players[1].battlefield[0] = makeBfCard('hearts', 2, '2', 0);
    sReinforce.players[0].battlefield[0] = makeBfCard('spades', 5, '5', 0);
    sReinforce.players[1].hand = [getBfCard('diamonds', 5, '5')];
    sReinforce = applyAction(sReinforce, {
      type: 'attack',
      playerIndex: 0,
      attackingColumn: 0,
      defendingColumn: 0,
      timestamp: MOCK_TIMESTAMP,
    });
    expect(sReinforce.phase).toBe('ReinforcementPhase');
    track(
      applyAction(
        sReinforce,
        { type: 'system:init', timestamp: MOCK_TIMESTAMP },
        { allowSystemInit: true },
      ),
    ); // from ReinforcementPhase

    // 5. Forfeit from various phases
    const testForfeitFrom = (fromPhase: GamePhase) => {
      let s = createInitialState({
        matchId: '00000000-0000-0000-0000-000000000000',
        players: [
          { id: 'p1', name: 'A' },
          { id: 'p2', name: 'B' },
        ],
        rngSeed: 1,
      });
      s = applyAction(s, { type: 'system:init', timestamp: INIT_TS }, { allowSystemInit: true });
      s.phase = fromPhase;
      s.activePlayerIndex = 0;
      track(
        applyAction(s, {
          type: 'forfeit',
          playerIndex: 0,
          timestamp: MOCK_TIMESTAMP,
        }),
      );
    };

    testForfeitFrom('StartTurn');
    testForfeitFrom('DeploymentPhase');
    testForfeitFrom('AttackResolution');
    testForfeitFrom('CleanupPhase');
    testForfeitFrom('DrawPhase');
    testForfeitFrom('EndTurn');
    testForfeitFrom('ReinforcementPhase');

    // 6. StartTurn -> gameOver (system:victory)
    let sVictory = createInitialState({
      matchId: '00000000-0000-0000-0000-000000000000',
      players: [
        { id: 'p1', name: 'A' },
        { id: 'p2', name: 'B' },
      ],
      rngSeed: 1,
      gameOptions: { classicDeployment: false },
    });
    sVictory = applyAction(
      sVictory,
      { type: 'system:init', timestamp: INIT_TS },
      { allowSystemInit: true },
    );
    sVictory.activePlayerIndex = 0;
    sVictory.players[1].battlefield = [
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    ] as Battlefield;
    sVictory.players[1].hand = [];
    sVictory.players[1].drawpile = [];
    sVictory = applyAction(sVictory, { type: 'pass', playerIndex: 0, timestamp: MOCK_TIMESTAMP });
    track(sVictory);
    expect(sVictory.phase).toBe('gameOver');

    // 7. System Advance: Skip reinforcement
    let s2 = createInitialState({
      matchId: '00000000-0000-0000-0000-000000000000',
      players: [
        { id: 'p1', name: 'A' },
        { id: 'p2', name: 'B' },
      ],
      rngSeed: 1,
      gameOptions: { classicDeployment: false },
    });
    s2 = applyAction(s2, { type: 'system:init', timestamp: INIT_TS }, { allowSystemInit: true });
    s2.players.forEach((p) => {
      p.battlefield = p.battlefield.map((_, i) => ({
        card: getBfCard('spades', 5, '5'),
        position: { row: Math.floor(i / 4), col: i % 4 },
        currentHp: 5,
        faceDown: false,
      })) as Battlefield;
      p.hand = [];
    });
    s2.activePlayerIndex = 0;
    track(
      applyAction(s2, {
        type: 'attack',
        playerIndex: 0,
        attackingColumn: 0,
        defendingColumn: 0,
        timestamp: MOCK_TIMESTAMP,
      }),
    );

    // Final Coverage Check
    const allTransitions = STATE_MACHINE.map((t) => `${t.from}|${t.trigger}|${t.to}`);
    const missing = allTransitions.filter((t) => !coveredTransitions.has(t));

    if (missing.length > 0) {
      throw new Error('Missing Transitions:\n' + missing.join('\n'));
    }

    expect(missing.length).toBe(0);
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

  it('deploy is rejected outside DeploymentPhase', () => {
    const bf = emptyBf();
    const state = makeCombatState(bf, bf); // phase: AttackPhase
    const result = validateAction(state, {
      type: 'deploy',
      playerIndex: 0,
      column: 0,
      cardId: 'any',
      timestamp: MOCK_TIMESTAMP,
    });
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/allowed in phase/);
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
    const p1Hand: Card[] = [{ suit: 'hearts', face: 'K', value: 11, type: 'king', id: 'h1' }];
    const base = makeCombatState(p0Bf, p1Bf, { p1Hand });
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
    // Transition moves to ReinforcementPhase (for defender) after attack.
    expect(s.phase).toBe('ReinforcementPhase');
  });
});
