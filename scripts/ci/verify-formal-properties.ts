#!/usr/bin/env tsx
/**
 * Exhaustive, machine-checked formal property verifier mirroring:
 *   - docs/formal/PhalanxDuelV3.tla
 *   - docs/print/formal-specification.typ
 *   - docs/print/face-to-face-quickstart.typ
 *   - docs/print/suit-reference-cards.typ
 *
 * Every axiom, theorem, edge case, and worked example published in the formal
 * specification and tabletop print kit is checked directly against the live
 * TypeScript engine (@phalanxduel/engine).
 *
 * Usage: node --import tsx scripts/ci/verify-formal-properties.ts
 */
import assert from 'node:assert/strict';
import type { BattlefieldCard, CardType, Suit } from '@phalanxduel/shared';
import {
  resolveCardBoundary,
  resolveCardTransition,
  resolvePlayerBoundary,
} from '../../engine/src/combat-math.js';
import { createDeck } from '../../engine/src/deck.js';
import { LIVENESS_POLICY } from '../../engine/src/liveness.js';
import { GAME_PHASES, STATE_MACHINE } from '../../engine/src/state-machine.js';

function makeBfCard(
  face: string,
  suit: Suit,
  value: number,
  type: CardType,
  row = 0,
): BattlefieldCard {
  return {
    card: { id: `${face}-${suit}`, face, suit, value, type },
    position: { row, col: 0 },
    currentHp: value,
    faceDown: false,
  };
}

// ============================================================================
// 1. Axiom 1 — Deck Values & Classic Geometry / Scarcity Invariants
// ============================================================================
const deck = createDeck();
assert.equal(deck.length, 52, 'Standard deck must contain 52 cards');
for (const card of deck) {
  if (card.type === 'ace') assert.equal(card.value, 1);
  else if (card.type === 'jack' || card.type === 'queen' || card.type === 'king') {
    assert.equal(card.value, 11);
  } else if (card.face === 'T') assert.equal(card.value, 10);
  else assert.equal(card.value, Number(card.face));
}
// Classic v3.0 geometry (r=2, c=4): r*c <= 48, h_max <= c, D0 = r*c + c = 12, 52 - D0 = 40 >= 4
const r = 2;
const cCols = 4;
const d0 = r * cCols + cCols;
assert.ok(r * cCols <= 48 && d0 === 12 && 52 - d0 >= 4, 'Classic geometry/scarcity invariants');

// ============================================================================
// 2. Face-Card Eligibility Partial Order (all 25 attacker x defender pairs)
// ============================================================================
const cardTypes: CardType[] = ['ace', 'number', 'jack', 'queen', 'king'];
let facePairsChecked = 0;
for (const attackerType of cardTypes) {
  for (const defenderType of cardTypes) {
    const isRestricted =
      (attackerType === 'jack' && (defenderType === 'queen' || defenderType === 'king')) ||
      (attackerType === 'queen' && defenderType === 'king');
    const target = makeBfCard(
      defenderType === 'ace'
        ? 'A'
        : defenderType === 'number'
          ? '5'
          : defenderType[0]!.toUpperCase(),
      'clubs',
      defenderType === 'ace' ? 1 : defenderType === 'number' ? 5 : 11,
      defenderType,
    );
    const classicRes = resolveCardTransition(target, 15, true, {
      attackerType,
      modeClassicAces: true,
      modeClassicFaceCards: true,
      modeDamagePersistence: 'classic',
    });
    const cumulativeRes = resolveCardTransition(target, 15, true, {
      attackerType,
      modeClassicAces: true,
      modeClassicFaceCards: true,
      modeDamagePersistence: 'cumulative',
    });

    if (isRestricted) {
      assert.equal(classicRes.destroyed, false);
      assert.equal(classicRes.carryover, 0);
      assert.equal(classicRes.remainingHp, target.currentHp);
      assert.equal(cumulativeRes.destroyed, false);
      assert.equal(cumulativeRes.carryover, 0);
      assert.equal(cumulativeRes.remainingHp, 1);
    } else {
      assert.ok(!classicRes.step.bonuses?.includes('faceCardIneligible'));
    }
    facePairsChecked += 1;
  }
}

// ============================================================================
// 3. Ace Duality & Invulnerability Theorem (front/back x all attacker types x d in 1..15)
// ============================================================================
let aceCasesChecked = 0;
for (const attackerType of cardTypes) {
  for (const isFrontRank of [true, false]) {
    for (let dmg = 1; dmg <= 15; dmg++) {
      const ace = makeBfCard('A', 'diamonds', 1, 'ace', isFrontRank ? 0 : 1);
      const res = resolveCardTransition(ace, dmg, isFrontRank, {
        attackerType,
        modeClassicAces: true,
        modeClassicFaceCards: true,
        modeDamagePersistence: 'classic',
      });
      if (attackerType === 'ace' && isFrontRank) {
        assert.equal(res.destroyed, true);
        assert.equal(res.remainingHp, 0);
        assert.equal(res.carryover, dmg - 1);
      } else {
        assert.equal(res.destroyed, false);
        assert.equal(res.remainingHp, 1);
        assert.equal(res.carryover, dmg - 1);
      }
      aceCasesChecked += 1;
    }
  }
}

// ============================================================================
// 4. Theorem 1 — Non-Commutative Suit Boundary Algebra (exact identity + iff)
// ============================================================================
let boundaryPairsChecked = 0;
for (let c = 0; c <= 40; c++) {
  for (let d = 0; d <= 20; d++) {
    const cardV3 = resolveCardBoundary({
      carryover: c,
      diamondShield: d,
      clubEligible: true,
      specVersion: '3.0',
    });
    const cardV1 = resolveCardBoundary({
      carryover: c,
      diamondShield: d,
      clubEligible: true,
      specVersion: '1.0',
    });
    const playerV3 = resolvePlayerBoundary({
      carryover: c,
      heartShield: d,
      spadeWeapon: true,
      specVersion: '3.0',
    });
    const playerV1 = resolvePlayerBoundary({
      carryover: c,
      heartShield: d,
      spadeWeapon: true,
      specVersion: '1.0',
    });

    // Exact closed-form identity for all c >= 0, d >= 0:
    //   B_v1(c, d) - B_v3(c, d) = min(d, max(0, 2c - d))
    const expectedGap = Math.min(d, Math.max(0, 2 * c - d));
    assert.equal(cardV1.carryover - cardV3.carryover, expectedGap);
    assert.equal(playerV1.damage - playerV3.damage, expectedGap);

    // Strict inequality iff 0 < d < 2c
    const strictExpected = d > 0 && d < 2 * c;
    assert.equal(cardV3.carryover < cardV1.carryover, strictExpected);
    assert.equal(playerV3.damage < playerV1.damage, strictExpected);

    // Shield >= carryover zeroes out weapon doubling completely
    if (d >= c) {
      assert.equal(cardV3.carryover, 0);
      assert.equal(playerV3.damage, 0);
    }

    boundaryPairsChecked += 1;
  }
}

// ============================================================================
// 5. Machine-Check All 4 Worked Examples from face-to-face-quickstart.typ
// ============================================================================
function runWorkedCascade(opts: {
  attackerValue: number;
  attackerSuit: Suit;
  attackerType?: CardType;
  front: BattlefieldCard;
  back: BattlefieldCard;
}) {
  const ctx = {
    attackerType: opts.attackerType ?? ('number' as CardType),
    modeClassicAces: true,
    modeClassicFaceCards: true,
    modeDamagePersistence: 'classic' as const,
  };
  const f = resolveCardTransition(opts.front, opts.attackerValue, true, ctx);
  const frontDiamond =
    f.destroyed && opts.front.card.suit === 'diamonds' ? opts.front.card.value : 0;
  const frontHeart = f.destroyed && opts.front.card.suit === 'hearts' ? opts.front.card.value : 0;
  const cb = resolveCardBoundary({
    carryover: f.carryover,
    diamondShield: frontDiamond,
    clubEligible: opts.attackerSuit === 'clubs' && f.destroyed,
    specVersion: '3.0',
  });
  const b =
    cb.carryover > 0
      ? resolveCardTransition(opts.back, cb.carryover, false, ctx)
      : { remainingHp: opts.back.currentHp, carryover: 0, destroyed: false };
  const lastHeart = b.destroyed
    ? opts.back.card.suit === 'hearts'
      ? opts.back.card.value
      : 0
    : frontHeart;
  const pb = resolvePlayerBoundary({
    carryover: b.carryover,
    heartShield: lastHeart,
    spadeWeapon: opts.attackerSuit === 'spades',
    specVersion: '3.0',
  });
  return { front: f, cardBoundary: cb, back: b, playerBoundary: pb };
}

// Example 1: 9♣ -> Front 4♦, Back 5♠ => 5♠ survives at 3 HP, 0 LP
const ex1 = runWorkedCascade({
  attackerValue: 9,
  attackerSuit: 'clubs',
  front: makeBfCard('4', 'diamonds', 4, 'number', 0),
  back: makeBfCard('5', 'spades', 5, 'number', 1),
});
assert.equal(ex1.cardBoundary.carryover, 2);
assert.equal(ex1.back.remainingHp, 3);
assert.equal(ex1.playerBoundary.damage, 0);

// Example 2: 10♠ -> Front 6♣, Back 2♥ => 0 LP
const ex2 = runWorkedCascade({
  attackerValue: 10,
  attackerSuit: 'spades',
  front: makeBfCard('6', 'clubs', 6, 'number', 0),
  back: makeBfCard('2', 'hearts', 2, 'number', 1),
});
assert.equal(ex2.back.destroyed, true);
assert.equal(ex2.playerBoundary.damage, 0);

// Example 3: 10♠ -> Front 5♣, Back 2♦ => 6 LP
const ex3 = runWorkedCascade({
  attackerValue: 10,
  attackerSuit: 'spades',
  front: makeBfCard('5', 'clubs', 5, 'number', 0),
  back: makeBfCard('2', 'diamonds', 2, 'number', 1),
});
assert.equal(ex3.playerBoundary.damage, 6);

// Example 4: 8♥ -> Front A♦, Back 3♣ => A♦ survives at 1 HP, 3♣ destroyed, 4 LP
const ex4 = runWorkedCascade({
  attackerValue: 8,
  attackerSuit: 'hearts',
  front: makeBfCard('A', 'diamonds', 1, 'ace', 0),
  back: makeBfCard('3', 'clubs', 3, 'number', 1),
});
assert.equal(ex4.front.destroyed, false);
assert.equal(ex4.front.remainingHp, 1);
assert.equal(ex4.back.destroyed, true);
assert.equal(ex4.playerBoundary.damage, 4);

// ============================================================================
// 6. Theorem 2 & 3 — Liveness Policy & FSM Deadlock Freedom
// ============================================================================
assert.equal(LIVENESS_POLICY.repetitionOccurrences, 3);
assert.equal(LIVENESS_POLICY.noProgressTurns, 50);
assert.equal(LIVENESS_POLICY.hardTurnLimit, 200);

for (const phase of GAME_PHASES) {
  if (phase === 'gameOver') continue;
  const outgoing = STATE_MACHINE.filter((t) => t.from === phase && t.to !== phase);
  assert.ok(outgoing.length >= 1, `Non-terminal phase "${phase}" has no outgoing transition`);
}

console.log(
  `Formal math verified: 52 deck values, ${facePairsChecked} face-card pairs, ${aceCasesChecked} Ace duality cases, ${boundaryPairsChecked} boundary pairs (exact identity + iff), 4 quickstart worked examples, liveness 3/50/200, ${GAME_PHASES.length - 1} deadlock-free FSM phases.`,
);
