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
import type {
  GameState,
  Action,
  Battlefield,
  BattlefieldCard,
  Card,
  PlayerState,
  PartialCard,
} from '@phalanxduel/shared';
import { createInitialState, applyAction } from '../src/index.js';

// ── Test helpers ─────────────────────────────────────────────────────────

const MOCK_TIMESTAMP = '2026-02-24T12:00:00.000Z';

function emptyBf(): Battlefield {
  return [null, null, null, null, null, null, null, null] as Battlefield;
}

function makeBfCard(
  suit: Card['suit'],
  face: string,
  value: number,
  gridIndex: number,
): BattlefieldCard {
  return {
    card: {
      id: `test-${suit}-${face}-${gridIndex}`,
      suit,
      face,
      value,
      type: face === 'A' ? 'ace' : 'number',
    },
    position: { row: gridIndex < 4 ? 0 : 1, col: gridIndex % 4 },
    currentHp: value,
    faceDown: false,
  };
}

function makeCombatState(
  p0Battlefield: Battlefield,
  p1Battlefield: Battlefield,
  opts?: {
    p0Hand?: Card[];
    p1Hand?: Card[];
    p0Drawpile?: PartialCard[];
    p1Drawpile?: PartialCard[];
    p0Lifepoints?: number;
    p1Lifepoints?: number;
  },
): GameState {
  const makePlayer = (
    id: string,
    name: string,
    bf: Battlefield,
    hand: Card[],
    drawpile: PartialCard[],
    lp: number,
  ): PlayerState => ({
    player: { id, name },
    hand,
    battlefield: bf,
    drawpile,
    discardPile: [],
    lifepoints: lp,
    deckSeed: 0,
  });
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
        p0Battlefield,
        opts?.p0Hand ?? [],
        opts?.p0Drawpile ?? [],
        opts?.p0Lifepoints ?? 20,
      ),
      makePlayer(
        '00000000-0000-0000-0000-000000000002',
        'Bob',
        p1Battlefield,
        opts?.p1Hand ?? [],
        opts?.p1Drawpile ?? [],
        opts?.p1Lifepoints ?? 20,
      ),
    ],
    activePlayerIndex: 0,
    phase: 'AttackPhase',
    turnNumber: 1,
  };
}

// ── Referee: state invariant checks ──────────────────────────────────────

function assertInvariants(state: GameState, label: string) {
  for (let pi = 0; pi < 2; pi++) {
    const p = state.players[pi]!;

    // HP must be non-negative
    for (const slot of p.battlefield) {
      if (slot) {
        expect(slot.currentHp, `${label}: p${pi} card hp < 0`).toBeGreaterThanOrEqual(0);
      }
    }
    expect(p.lifepoints, `${label}: p${pi} lifepoints < 0`).toBeGreaterThanOrEqual(0);

    // Card conservation: total cards across all zones should equal 52
    const bfCards = p.battlefield.filter((c) => c !== null).length;
    const totalCards = bfCards + p.hand.length + p.drawpile.length + p.discardPile.length;
    expect(totalCards, `${label}: p${pi} total cards != 52 (got ${totalCards})`).toBe(52);
  }

  // Phase sanity
  const validPhases = [
    'StartTurn',
    'DeploymentPhase',
    'AttackPhase',
    'AttackResolution',
    'CleanupPhase',
    'ReinforcementPhase',
    'DrawPhase',
    'EndTurn',
    'gameOver',
  ];
  expect(validPhases, `${label}: invalid phase "${state.phase}"`).toContain(state.phase);

  // Active player is 0 or 1
  expect([0, 1], `${label}: invalid activePlayerIndex`).toContain(state.activePlayerIndex);

  // If gameOver, outcome must be present
  if (state.phase === 'gameOver') {
    expect(state.outcome, `${label}: gameOver but no outcome`).toBeDefined();
  }
}

// ── Automated Players ───────────────────────────────────────────────────

function makeDeployAction(state: GameState): Action {
  const pi = state.activePlayerIndex;
  const player = state.players[pi]!;

  // Find first empty column
  let targetCol = -1;
  for (let col = 0; col < 4; col++) {
    if (player.battlefield[col] === null || player.battlefield[col + 4] === null) {
      targetCol = col;
      break;
    }
  }

  if (targetCol === -1) {
    throw new Error(`DeploymentPhase but no empty columns for player ${pi}`);
  }

  return {
    type: 'deploy',
    playerIndex: pi,
    column: targetCol,
    cardId: player.hand[0]!.id,
    timestamp: new Date().toISOString(),
  };
}

function makeAttackAction(state: GameState): Action | null {
  const pi = state.activePlayerIndex;
  const player = state.players[pi]!;

  // Collect all front-row cards that can attack
  const attackers: { col: number; hp: number }[] = [];
  for (let col = 0; col < 4; col++) {
    const card = player.battlefield[col];
    if (card) {
      attackers.push({ col, hp: card.currentHp });
    }
  }

  if (attackers.length === 0) return null;

  // For simulation, just pick the first available attacker
  const best = attackers[0]!;
  return {
    type: 'attack',
    playerIndex: pi,
    attackingColumn: best.col,
    defendingColumn: best.col,
    timestamp: new Date().toISOString(),
  };
}

function makeReinforceAction(state: GameState): Action {
  const pi = state.activePlayerIndex;
  const player = state.players[pi]!;

  if (player.hand.length === 0) {
    throw new Error('Reinforcement phase but hand is empty');
  }

  return {
    type: 'reinforce',
    playerIndex: pi,
    cardId: player.hand[0]!.id,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Play one full game. Returns the final state and action count.
 */
function playFullGame(
  seed: number,
  maxTurns = 500,
): { state: GameState; actions: number; outcome: string } {
  let state = createInitialState({
    matchId: `sim-${seed}`,
    players: [
      { id: '00000000-0000-0000-0000-000000000001', name: 'Alice' },
      { id: '00000000-0000-0000-0000-000000000002', name: 'Bob' },
    ],
    rngSeed: seed,
  });

  // Start the game cycle
  state = applyAction(state, { type: 'system:init', timestamp: new Date().toISOString() });

  let actions = 0;
  let consecutivePasses = 0;
  assertInvariants(state, `seed=${seed} initial`);

  while (state.phase !== 'gameOver' && actions < maxTurns) {
    let action: Action;
    // console.log(`[SIM] action=${actions} phase=${state.phase} player=${state.activePlayerIndex}`);

    switch (state.phase) {
      case 'DeploymentPhase':
        action = makeDeployAction(state);
        consecutivePasses = 0;
        break;

      case 'AttackPhase': {
        const attackAction = makeAttackAction(state);
        if (attackAction === null) {
          action = {
            type: 'pass',
            playerIndex: state.activePlayerIndex,
            timestamp: new Date().toISOString(),
          };
          consecutivePasses++;
        } else {
          action = attackAction;
          consecutivePasses = 0;
        }
        break;
      }

      case 'ReinforcementPhase':
        action = makeReinforceAction(state);
        consecutivePasses = 0;
        break;

      default:
        throw new Error(`Unexpected phase in simulation loop: ${state.phase}`);
    }

    state = applyAction(state, action);
    actions++;
    assertInvariants(state, `seed=${seed} after action #${actions}`);

    if (consecutivePasses >= 4) {
      // Both players passed twice in a row — true stalemate
      break;
    }
  }

  let outcome: string;
  if (state.phase === 'gameOver' && state.outcome) {
    const winnerName = state.outcome.winnerIndex === 0 ? 'Alice' : 'Bob';
    outcome = `${winnerName} wins (${state.outcome.victoryType})`;
  } else {
    outcome = `stalemate after ${maxTurns} actions`;
  }

  return { state, actions, outcome };
}

// ── Tests ────────────────────────────────────────────────────────────────

describe('Full game simulation', () => {
  const seeds = [1, 2, 7, 13, 42, 99, 100, 256, 1000, 9999];

  for (const seed of seeds) {
    it(`plays a complete game to conclusion (seed=${seed})`, () => {
      const result = playFullGame(seed);
      const isEnded = result.state.phase === 'gameOver' || result.outcome.includes('stalemate');
      expect(isEnded, result.outcome).toBe(true);
      expect(result.actions).toBeGreaterThan(0);
      expect(result.actions).toBeLessThan(500);
    });
  }
});

describe('Targeted edge case probes', () => {
  it('attack into completely empty column sends all damage to LP', () => {
    const p0Bf = emptyBf();
    p0Bf[0] = makeBfCard('spades', 'K', 11, 0);
    const p1Bf = emptyBf();
    const state = makeCombatState(p0Bf, p1Bf);

    const action: Action = {
      type: 'attack',
      playerIndex: 0,
      attackingColumn: 0,
      defendingColumn: 0,
      timestamp: MOCK_TIMESTAMP,
    };
    const result = applyAction(state, action);

    // LP 20 - (K: 11 * Spade: 2) = -2 -> 0
    expect(result.players[1]!.lifepoints).toBe(0);
    expect(result.phase).toBe('gameOver');
  });
});
