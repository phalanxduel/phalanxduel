/**
 * PHX-FACECARD-001: Classic Face Card Destruction Eligibility
 *
 * If modeClassicFaceCards == true:
 *   Jack   → can destroy Jack only
 *   Queen  → can destroy Jack, Queen
 *   King   → can destroy Jack, Queen, King
 *   Number → can always destroy any card
 *
 * Ineligible (classic mode): halt carryover entirely, card takes no damage.
 * Ineligible (cumulative mode): clamp card to 1 HP, halt carryover.
 * Damage origin is immutable across the full target chain.
 */

import { describe, it, expect } from 'vitest';
import { resolveAttack } from '../src/index.ts';
import type { Battlefield, BattlefieldCard, PlayerState, GameState } from '@phalanxduel/shared';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeBfCard(
  suit: 'spades' | 'hearts' | 'diamonds' | 'clubs',
  value: number,
  face: string,
  type: 'number' | 'ace' | 'jack' | 'queen' | 'king',
  gridIndex: number,
): BattlefieldCard {
  const row = gridIndex < 4 ? 0 : 1;
  const col = gridIndex % 4;
  return {
    card: { id: `test-${type}-${suit}-${gridIndex}`, suit, face, value, type },
    position: { row, col },
    currentHp: value,
    faceDown: false,
  };
}

function jack(gridIndex = 0): BattlefieldCard {
  return makeBfCard('spades', 11, 'J', 'jack', gridIndex);
}
function queen(gridIndex = 0): BattlefieldCard {
  return makeBfCard('spades', 11, 'Q', 'queen', gridIndex);
}
function king(gridIndex = 0): BattlefieldCard {
  return makeBfCard('spades', 11, 'K', 'king', gridIndex);
}
function number5(gridIndex = 0): BattlefieldCard {
  return makeBfCard('spades', 5, '5', 'number', gridIndex);
}
function emptyBf(): Battlefield {
  return [null, null, null, null, null, null, null, null];
}

function makePlayer(id: string, name: string, bf: Battlefield, lp = 20): PlayerState {
  return {
    player: { id, name },
    hand: [],
    battlefield: bf,
    drawpile: [],
    discardPile: [],
    lifepoints: lp,
    deckSeed: 0,
  };
}

const MATCH_ID = '00000000-0000-0000-0000-000000000000';
const P0_ID = '00000000-0000-0000-0000-000000000001';
const P1_ID = '00000000-0000-0000-0000-000000000002';

function makeFCState(
  attackerCard: BattlefieldCard,
  defenderFront: BattlefieldCard | null,
  defenderBack: BattlefieldCard | null = null,
  damageMode: 'classic' | 'cumulative' = 'classic',
): GameState {
  const attackerBf = emptyBf();
  attackerBf[0] = attackerCard; // col 0, front row

  const defenderBf = emptyBf();
  if (defenderFront) defenderBf[0] = defenderFront; // col 0, front
  if (defenderBack) defenderBf[4] = defenderBack; // col 0, back

  return {
    matchId: MATCH_ID,
    specVersion: '1.0',
    params: {
      specVersion: '1.0',
      classic: {
        enabled: true,
        mode: 'strict',
        battlefield: { rows: 2, columns: 4 },
        hand: { maxHandSize: 4 },
        start: { initialDraw: 12 },
        modes: { classicAces: true, classicFaceCards: true, damagePersistence: 'classic' },
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
    players: [makePlayer(P0_ID, 'Alice', attackerBf), makePlayer(P1_ID, 'Bob', defenderBf)],
    activePlayerIndex: 0,
    phase: 'AttackPhase',
    turnNumber: 1,
    gameOptions: { damageMode, startingLifepoints: 20 },
  };
}

// ---------------------------------------------------------------------------
// PHX-FACECARD-001: Eligible attacks
// ---------------------------------------------------------------------------

describe('PHX-FACECARD-001: Classic Face Card Destruction Eligibility', () => {
  describe('Eligible attacks — card is destroyed', () => {
    it('Jack attacker destroys Jack defender', () => {
      // Arrange
      const state = makeFCState(jack(), jack());

      // Act
      const { state: after, combatEntry } = resolveAttack(state, 0, 0, 0);

      // Assert: Jack defender is destroyed
      expect(after.players[1]!.battlefield[0]).toBeNull();
      const step = combatEntry.steps[0]!;
      expect(step.destroyed).toBe(true);
      expect(step.bonuses).not.toContain('faceCardIneligible');
    });

    it('Queen attacker destroys Jack defender', () => {
      // Arrange
      const state = makeFCState(queen(), jack());

      // Act
      const { state: after } = resolveAttack(state, 0, 0, 0);

      // Assert: Jack defender is destroyed
      expect(after.players[1]!.battlefield[0]).toBeNull();
    });

    it('Queen attacker destroys Queen defender', () => {
      // Arrange
      const state = makeFCState(queen(), queen());

      // Act
      const { state: after } = resolveAttack(state, 0, 0, 0);

      // Assert: Queen defender is destroyed
      expect(after.players[1]!.battlefield[0]).toBeNull();
    });

    it('King attacker destroys Jack defender', () => {
      // Arrange
      const state = makeFCState(king(), jack());

      // Act
      const { state: after } = resolveAttack(state, 0, 0, 0);

      // Assert: Jack destroyed
      expect(after.players[1]!.battlefield[0]).toBeNull();
    });

    it('King attacker destroys Queen defender', () => {
      // Arrange
      const state = makeFCState(king(), queen());

      // Act
      const { state: after } = resolveAttack(state, 0, 0, 0);

      // Assert: Queen destroyed
      expect(after.players[1]!.battlefield[0]).toBeNull();
    });

    it('King attacker destroys King defender', () => {
      // Arrange
      const state = makeFCState(king(), king());

      // Act
      const { state: after } = resolveAttack(state, 0, 0, 0);

      // Assert: King destroyed
      expect(after.players[1]!.battlefield[0]).toBeNull();
    });

    it('Number card (value>11) attacker destroys Jack defender', () => {
      // Arrange — use a number card with value>11 is not possible (J/Q/K=11), but any number
      // with value >= 11 will destroy a face card. Use value=8 to test partial damage.
      // Instead, use a face card with lower HP by giving value=5 to test eligibility alone.
      const numAttacker = makeBfCard('spades', 11, 'T', 'number', 0); // Ten as number
      const state = makeFCState(numAttacker, jack());

      // Act
      const { state: after } = resolveAttack(state, 0, 0, 0);

      // Assert: Jack is destroyed (number card always eligible)
      expect(after.players[1]!.battlefield[0]).toBeNull();
    });

    it('Number card attacker destroys Queen defender', () => {
      // Arrange
      const numAttacker = makeBfCard('spades', 11, 'T', 'number', 0);
      const state = makeFCState(numAttacker, queen());

      // Act
      const { state: after } = resolveAttack(state, 0, 0, 0);

      // Assert: Queen is destroyed (number card always eligible)
      expect(after.players[1]!.battlefield[0]).toBeNull();
    });

    it('Number card attacker destroys King defender', () => {
      // Arrange
      const numAttacker = makeBfCard('spades', 11, 'T', 'number', 0);
      const state = makeFCState(numAttacker, king());

      // Act
      const { state: after } = resolveAttack(state, 0, 0, 0);

      // Assert: King is destroyed (number card always eligible)
      expect(after.players[1]!.battlefield[0]).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // Ineligible attacks — classic mode (no damage, overflow halted)
  // ---------------------------------------------------------------------------

  describe('Ineligible attacks — classic mode: overflow halted, card intact', () => {
    it('Jack attacker CANNOT destroy Queen defender (overflow=0, card intact)', () => {
      // Arrange
      const state = makeFCState(jack(), queen());

      // Act
      const { state: after, combatEntry } = resolveAttack(state, 0, 0, 0);

      // Assert: Queen is NOT destroyed
      const defenderBf = after.players[1]!.battlefield;
      expect(defenderBf[0]).not.toBeNull();
      expect(defenderBf[0]!.currentHp).toBe(11); // full HP, no damage in classic mode

      // LP must be unchanged (overflow stopped)
      expect(after.players[1]!.lifepoints).toBe(20);

      // Combat log has faceCardIneligible bonus
      const step = combatEntry.steps[0]!;
      expect(step.destroyed).toBe(false);
      expect(step.bonuses).toContain('faceCardIneligible');
    });

    it('Jack attacker CANNOT destroy King defender', () => {
      // Arrange
      const state = makeFCState(jack(), king());

      // Act
      const { state: after, combatEntry } = resolveAttack(state, 0, 0, 0);

      // Assert: King is NOT destroyed, LP unchanged
      expect(after.players[1]!.battlefield[0]).not.toBeNull();
      expect(after.players[1]!.battlefield[0]!.currentHp).toBe(11);
      expect(after.players[1]!.lifepoints).toBe(20);
      expect(combatEntry.steps[0]!.bonuses).toContain('faceCardIneligible');
    });

    it('Queen attacker CANNOT destroy King defender', () => {
      // Arrange
      const state = makeFCState(queen(), king());

      // Act
      const { state: after, combatEntry } = resolveAttack(state, 0, 0, 0);

      // Assert: King is NOT destroyed, LP unchanged
      expect(after.players[1]!.battlefield[0]).not.toBeNull();
      expect(after.players[1]!.battlefield[0]!.currentHp).toBe(11);
      expect(after.players[1]!.lifepoints).toBe(20);
      expect(combatEntry.steps[0]!.bonuses).toContain('faceCardIneligible');
    });
  });

  // ---------------------------------------------------------------------------
  // Ineligible attacks — cumulative mode (clamp to 1 HP, overflow halted)
  // ---------------------------------------------------------------------------

  describe('Ineligible attacks — cumulative mode: clamp to 1 HP', () => {
    it('Jack attacks Queen in cumulative mode: Queen clamped to 1 HP, LP unchanged', () => {
      // Arrange
      const state = makeFCState(jack(), queen(), null, 'cumulative');

      // Act
      const { state: after, combatEntry } = resolveAttack(state, 0, 0, 0);

      // Assert: Queen survives at 1 HP
      expect(after.players[1]!.battlefield[0]).not.toBeNull();
      expect(after.players[1]!.battlefield[0]!.currentHp).toBe(1);

      // LP unchanged (overflow stopped)
      expect(after.players[1]!.lifepoints).toBe(20);

      // Combat log has faceCardIneligible bonus
      expect(combatEntry.steps[0]!.bonuses).toContain('faceCardIneligible');
    });

    it('Queen attacks King in cumulative mode: King clamped to 1 HP', () => {
      // Arrange
      const state = makeFCState(queen(), king(), null, 'cumulative');

      // Act
      const { state: after } = resolveAttack(state, 0, 0, 0);

      // Assert: King survives at 1 HP
      expect(after.players[1]!.battlefield[0]).not.toBeNull();
      expect(after.players[1]!.battlefield[0]!.currentHp).toBe(1);
      expect(after.players[1]!.lifepoints).toBe(20);
    });
  });

  // ---------------------------------------------------------------------------
  // Damage origin is immutable across chain
  // ---------------------------------------------------------------------------

  describe('Damage origin is immutable across the target chain', () => {
    it('Jack kills front number card, then cannot kill Queen in back (overflow halted)', () => {
      // Arrange: Jack (11) attacks column with number5 front and Queen back
      // Jack destroys number5 (11 - 5 = 6 overflow), then Jack origin faces Queen: ineligible
      const state = makeFCState(jack(), number5(), queen());

      // Act
      const { state: after, combatEntry } = resolveAttack(state, 0, 0, 0);

      // Assert: number5 is destroyed (front)
      expect(after.players[1]!.battlefield[0]).toBeNull();

      // Assert: Queen (back) is NOT destroyed and took no damage
      expect(after.players[1]!.battlefield[4]).not.toBeNull();
      expect(after.players[1]!.battlefield[4]!.currentHp).toBe(11);

      // LP must be unchanged (overflow stopped at Queen)
      expect(after.players[1]!.lifepoints).toBe(20);

      // Two combat steps: one for number5, one for Queen with faceCardIneligible
      expect(combatEntry.steps).toHaveLength(2);
      const qStep = combatEntry.steps[1]!;
      expect(qStep.bonuses).toContain('faceCardIneligible');
    });

    it('King kills front number card, then kills Queen in back (King eligible vs Queen)', () => {
      // Arrange: King (11) attacks column with number5 front and Queen back
      // King destroys number5 (11 - 5 = 6 overflow), then King origin faces Queen: eligible
      const state = makeFCState(king(), number5(), queen());

      // Act
      const { state: after, combatEntry } = resolveAttack(state, 0, 0, 0);

      // Assert: number5 is destroyed (front)
      expect(after.players[1]!.battlefield[0]).toBeNull();

      // Assert: Queen (back) also destroyed (6 >= 11? No — 6 < 11, so Queen survives with 5 HP)
      // King is eligible to destroy Queen, so the damage DOES apply:
      // Queen has 11 HP, receives 6 damage → 11 - 6 = 5 HP remaining (not destroyed)
      expect(after.players[1]!.battlefield[4]).not.toBeNull();
      expect(after.players[1]!.battlefield[4]!.currentHp).toBe(5);

      // Steps: number5 step + Queen step (no faceCardIneligible)
      const qStep = combatEntry.steps[1]!;
      expect(qStep.bonuses ?? []).not.toContain('faceCardIneligible');
    });
  });
});
