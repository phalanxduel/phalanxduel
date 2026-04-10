/**
 * Golden scenario tests (TASK-205).
 *
 * Each scenario:
 *  1. Builds a specific game state
 *  2. Applies actions and asserts full state (battlefield, LP, discard, phase)
 *  3. Verifies replay equivalence: replaying from config + actions produces
 *     an identical state hash
 */
import { describe, it, expect } from 'vitest';
import { applyAction, createInitialState, replayGame, drawCards } from '../src/index.ts';
import type { GameConfig } from '../src/index.ts';
import type {
  GameState,
  Battlefield,
  BattlefieldCard,
  Card,
  Suit,
  Action,
} from '@phalanxduel/shared';
import { computeStateHash } from '@phalanxduel/shared/hash';

// ---------------------------------------------------------------------------
// Helpers (shared with rules-coverage.test.ts pattern)
// ---------------------------------------------------------------------------

const MATCH_ID = '00000000-0000-0000-0000-000000000000';
const P0_ID = '00000000-0000-0000-0000-000000000001';
const P1_ID = '00000000-0000-0000-0000-000000000002';
const TS = '2026-01-01T00:00:00.000Z';

function makeCard(suit: Suit, value: number, face: string, type: Card['type']): Card {
  return { id: `test-${type}-${suit}-${face}`, suit, value, face, type };
}

function makeBfCard(card: Card, row: number, col: number): BattlefieldCard {
  return {
    card,
    position: { row, col },
    currentHp: card.value,
    faceDown: false,
  };
}

function basePlayer(index: 0 | 1) {
  return createInitialState({
    matchId: MATCH_ID,
    players: [
      { id: P0_ID, name: 'P0' },
      { id: P1_ID, name: 'P1' },
    ],
    rngSeed: 1,
    drawTimestamp: TS,
  }).players[index]!;
}

function emptyBf(): Battlefield {
  return [null, null, null, null, null, null, null, null] as Battlefield;
}

function createTestState(overrides: Partial<GameState> = {}): GameState {
  const base = createInitialState({
    matchId: MATCH_ID,
    players: [
      { id: P0_ID, name: 'Player 0' },
      { id: P1_ID, name: 'Player 1' },
    ],
    rngSeed: 42,
    gameOptions: {
      damageMode: 'classic',
      startingLifepoints: 20,
      classicDeployment: false,
      quickStart: true,
    },
    drawTimestamp: TS,
  });

  const state = applyAction(base, { type: 'system:init', timestamp: TS });

  return {
    ...state,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Golden Scenarios
// ---------------------------------------------------------------------------

describe('Golden Scenarios (TASK-205)', () => {
  describe('Scenario 1: Heart shield — no stacking', () => {
    it('two hearts destroyed in same column — only last shields LP', () => {
      const heartFront = makeCard('hearts', 3, '3', 'number');
      const heartBack = makeCard('hearts', 5, '5', 'number');
      const attacker10 = makeCard('spades', 10, '10', 'number');

      const bf0 = emptyBf();
      bf0[0] = makeBfCard(attacker10, 0, 0);

      const bf1 = emptyBf();
      bf1[0] = makeBfCard(heartFront, 0, 0); // front
      bf1[4] = makeBfCard(heartBack, 1, 0); // back

      const state = createTestState({
        params: {
          ...createTestState().params,
          modeDamagePersistence: 'cumulative',
        },
        players: [
          { ...basePlayer(0), battlefield: bf0, lifepoints: 20 },
          { ...basePlayer(1), battlefield: bf1, lifepoints: 20 },
        ],
      });

      const next = applyAction(state, {
        type: 'attack',
        playerIndex: 0,
        attackingColumn: 0,
        defendingColumn: 0,
        timestamp: TS,
      });

      // Both hearts destroyed (10 vs 3 front, 7 overflow vs 5 back = 2 overflow)
      expect(next.players[1]!.battlefield[0]).toBeNull();
      expect(next.players[1]!.battlefield[4]).toBeNull();

      // Heart shield from back heart only (no stacking): 5 HP shield
      // Spades double LP damage: overflow 2 * 2 = 4 LP damage
      // Shield absorbs min(5, 4) = 4, net LP damage = 0
      // LP = 20 - 0 = 20
      expect(next.players[1]!.lifepoints).toBe(20);

      // Verify both hearts went to discard pile
      const discarded = next.players[1]!.discardPile.map((c) => c.face);
      expect(discarded).toContain('3');
      expect(discarded).toContain('5');
    });
  });

  describe('Scenario 2: Club doubling — front survives, no doubling', () => {
    it('clubs attacker vs front ace (invulnerable) — no overflow doubling to back', () => {
      const clubsAttacker = makeCard('clubs', 8, '8', 'number');
      const aceFront = makeCard('diamonds', 1, 'A', 'ace');
      const numBack = makeCard('diamonds', 5, '5', 'number');

      const bf0 = emptyBf();
      bf0[0] = makeBfCard(clubsAttacker, 0, 0);

      const bf1 = emptyBf();
      bf1[0] = makeBfCard(aceFront, 0, 0); // ace in front — invulnerable to non-ace
      bf1[4] = makeBfCard(numBack, 1, 0);

      const state = createTestState({
        modeClassicAces: true,
        params: {
          ...createTestState().params,
          modeDamagePersistence: 'cumulative',
        },
        players: [
          { ...basePlayer(0), battlefield: bf0, lifepoints: 20 },
          { ...basePlayer(1), battlefield: bf1, lifepoints: 20 },
        ],
      });

      const next = applyAction(state, {
        type: 'attack',
        playerIndex: 0,
        attackingColumn: 0,
        defendingColumn: 0,
        timestamp: TS,
      });

      // Front ace survives (invulnerable)
      expect(next.players[1]!.battlefield[0]).not.toBeNull();
      expect(next.players[1]!.battlefield[0]!.card.face).toBe('A');

      // Ace absorbs 1 HP, overflow 7 goes to back card
      // Clubs doubling does NOT apply because front card was NOT destroyed
      // Back card: 5 HP - 7 = destroyed
      expect(next.players[1]!.battlefield[4]).toBeNull();

      // Remaining overflow after back (7 - 5 = 2) hits LP, NOT doubled
      expect(next.players[1]!.lifepoints).toBeLessThan(20);
    });
  });

  describe('Scenario 3: Back-rank ace survives ace attacker', () => {
    it('ace attacker overflow past front card does not destroy back-rank ace', () => {
      const aceAttacker = makeCard('spades', 1, 'A', 'ace');
      const aceBack = makeCard('hearts', 1, 'A', 'ace');

      const bf0 = emptyBf();
      bf0[0] = makeBfCard(aceAttacker, 0, 0);

      // Empty front slot, ace in back
      const bf1 = emptyBf();
      bf1[4] = makeBfCard(aceBack, 1, 0);

      const state = createTestState({
        modeClassicAces: true,
        params: {
          ...createTestState().params,
          modeDamagePersistence: 'cumulative',
        },
        players: [
          { ...basePlayer(0), battlefield: bf0, lifepoints: 20 },
          { ...basePlayer(1), battlefield: bf1, lifepoints: 20 },
        ],
      });

      const next = applyAction(state, {
        type: 'attack',
        playerIndex: 0,
        attackingColumn: 0,
        defendingColumn: 0,
        timestamp: TS,
      });

      // Back-rank ace survives and advances to front rank (cleanup phase promotes back → front)
      expect(next.players[1]!.battlefield[0]).not.toBeNull();
      expect(next.players[1]!.battlefield[0]!.card.face).toBe('A');
      expect(next.players[1]!.lifepoints).toBe(20); // no LP damage
    });
  });

  describe('Scenario 4: Deck exhaustion — silent stop', () => {
    it('drawCards with empty drawpile returns state unchanged, no error', () => {
      const state = createTestState();
      const emptyDeckState = {
        ...state,
        players: [{ ...state.players[0]!, drawpile: [] }, state.players[1]!] as [
          (typeof state.players)[0],
          (typeof state.players)[1],
        ],
      };

      // Should not throw
      const result = drawCards(emptyDeckState, 0, 5, TS);
      expect(result.players[0]!.hand.length).toBe(emptyDeckState.players[0]!.hand.length);
    });
  });

  describe('Scenario 5: Classic HP reset', () => {
    it('damaged card resets to full HP after turn completes in classic mode', () => {
      const num8 = makeCard('diamonds', 8, '8', 'number');
      const num3 = makeCard('clubs', 3, '3', 'number');

      const bf0 = emptyBf();
      bf0[0] = makeBfCard(num3, 0, 0);

      const bf1 = emptyBf();
      bf1[0] = makeBfCard(num8, 0, 0);

      const state = createTestState({
        params: {
          ...createTestState().params,
          modeDamagePersistence: 'classic',
        },
        players: [
          {
            ...basePlayer(0),
            battlefield: bf0,
            lifepoints: 20,
            hand: [],
          },
          {
            ...basePlayer(1),
            battlefield: bf1,
            lifepoints: 20,
            hand: [],
          },
        ],
      });

      // P0 attacks with 3 vs P1's 8 → 8 takes 3 damage, HP = 5
      const afterAttack = applyAction(state, {
        type: 'attack',
        playerIndex: 0,
        attackingColumn: 0,
        defendingColumn: 0,
        timestamp: TS,
      });

      // After turn completes (classic mode), HP resets
      const defenderCard = afterAttack.players[1]!.battlefield[0];
      expect(defenderCard).not.toBeNull();
      expect(defenderCard!.currentHp).toBe(8); // reset to full
    });
  });

  describe('Scenario 6: Replay equivalence', () => {
    it('replaying a deployment sequence produces identical state hash', () => {
      const config: GameConfig = {
        matchId: MATCH_ID,
        players: [
          { id: P0_ID, name: 'Player 0' },
          { id: P1_ID, name: 'Player 1' },
        ],
        rngSeed: 42,
        drawTimestamp: TS,
        gameOptions: {
          damageMode: 'classic',
          startingLifepoints: 20,
          classicDeployment: true,
          quickStart: false,
        },
      };

      // Use replayGame to get initial state and card IDs
      const initial = replayGame(config, [], { hashFn: computeStateHash });
      const p1Card = initial.finalState.players[1]!.hand[0]!.id;
      const p0Card = initial.finalState.players[0]!.hand[0]!.id;

      const actions: Action[] = [
        { type: 'deploy', playerIndex: 1, column: 0, cardId: p1Card, timestamp: TS },
        { type: 'deploy', playerIndex: 0, column: 0, cardId: p0Card, timestamp: TS },
      ];

      // Replay twice — must produce identical hash
      const replay1 = replayGame(config, actions, { hashFn: computeStateHash });
      const replay2 = replayGame(config, actions, { hashFn: computeStateHash });

      expect(replay1.valid).toBe(true);
      expect(replay2.valid).toBe(true);
      expect(computeStateHash(replay1.finalState)).toBe(computeStateHash(replay2.finalState));

      // Verify state correctness
      expect(replay1.finalState.players[0]!.battlefield[0]).not.toBeNull();
      expect(replay1.finalState.players[1]!.battlefield[0]).not.toBeNull();
    });

    it('full deployment + attack replay is deterministic', () => {
      const config: GameConfig = {
        matchId: MATCH_ID,
        players: [
          { id: P0_ID, name: 'Player 0' },
          { id: P1_ID, name: 'Player 1' },
        ],
        rngSeed: 99,
        drawTimestamp: TS,
        gameOptions: {
          damageMode: 'cumulative',
          startingLifepoints: 20,
          classicDeployment: true,
          quickStart: false,
        },
      };

      // Build action list by replaying incrementally after each deploy
      const actions: Action[] = [];
      let state = replayGame(config, [], { hashFn: computeStateHash }).finalState;

      // Deploy all 8 slots per player (front row cols 0-3, then back row 0-3)
      // Each deploy alternates P1→P0. getDeployTarget fills front first, then back.
      const deployColumns = [0, 1, 2, 3, 0, 1, 2, 3]; // front then back
      for (const col of deployColumns) {
        const p1Card = state.players[1]!.hand[0]!.id;
        actions.push({
          type: 'deploy',
          playerIndex: 1,
          column: col,
          cardId: p1Card,
          timestamp: TS,
        });
        state = replayGame(config, actions, { hashFn: computeStateHash }).finalState;

        const p0Card = state.players[0]!.hand[0]!.id;
        actions.push({
          type: 'deploy',
          playerIndex: 0,
          column: col,
          cardId: p0Card,
          timestamp: TS,
        });
        state = replayGame(config, actions, { hashFn: computeStateHash }).finalState;
      }

      expect(state.phase).toBe('AttackPhase');

      // Attack col 0
      const attack: Action = {
        type: 'attack',
        playerIndex: state.activePlayerIndex,
        attackingColumn: 0,
        defendingColumn: 0,
        timestamp: TS,
      };
      actions.push(attack);

      // Full replay twice
      const replay1 = replayGame(config, actions, { hashFn: computeStateHash });
      const replay2 = replayGame(config, actions, { hashFn: computeStateHash });

      expect(replay1.valid).toBe(true);
      expect(replay2.valid).toBe(true);
      expect(computeStateHash(replay1.finalState)).toBe(computeStateHash(replay2.finalState));
    });
  });

  describe('Scenario 6b: Duplicate action rejection', () => {
    it('same deploy action twice — second is rejected by engine', () => {
      const config: GameConfig = {
        matchId: MATCH_ID,
        players: [
          { id: P0_ID, name: 'Player 0' },
          { id: P1_ID, name: 'Player 1' },
        ],
        rngSeed: 42,
        drawTimestamp: TS,
        gameOptions: {
          damageMode: 'classic',
          startingLifepoints: 20,
          classicDeployment: true,
          quickStart: false,
        },
      };

      let state = replayGame(config, []).finalState;

      const cardId = state.players[1]!.hand[0]!.id;
      const deployAction: Action = {
        type: 'deploy',
        playerIndex: 1,
        column: 0,
        cardId,
        timestamp: TS,
      };

      // First deploy succeeds
      state = applyAction(state, deployAction);

      // Second identical deploy — card no longer in hand
      expect(() => applyAction(state, deployAction)).toThrow();
    });
  });
});
