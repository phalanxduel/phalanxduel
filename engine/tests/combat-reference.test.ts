import { describe, expect, it } from 'vitest';
import {
  COMBAT_PROOF_DOMAIN_VERSION,
  referenceBattlefieldStates,
  referenceCards,
  referenceLpDomain,
  referenceModeDomain,
} from '../src/assurance/combat-proof-domain.ts';
import { resolveReferenceCombat } from '../src/assurance/combat-reference.ts';

describe('independent combat reference model', () => {
  it('enumerates the complete canonical card, mode, HP, and LP domains', () => {
    const cards = referenceCards();
    const frontStates = referenceBattlefieldStates(0);

    expect(COMBAT_PROOF_DOMAIN_VERSION).toBe(1);
    expect(cards).toHaveLength(52);
    expect(new Set(cards.map((card) => card.suit))).toEqual(
      new Set(['clubs', 'diamonds', 'hearts', 'spades']),
    );
    expect(new Set(cards.map((card) => card.type))).toEqual(
      new Set(['ace', 'number', 'jack', 'queen', 'king']),
    );
    expect(new Set(cards.map((card) => card.value))).toEqual(
      new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]),
    );
    expect(frontStates).toHaveLength(352);
    expect(referenceBattlefieldStates(1)).toHaveLength(352);
    expect(referenceModeDomain()).toHaveLength(24);
    expect(referenceLpDomain()).toEqual(Array.from({ length: 501 }, (_, value) => value));
  });

  it('uses only the final destroyed Heart for v2.0 player shielding', () => {
    const [heart, number, spade] = [
      referenceCards().find((card) => card.face === '2' && card.suit === 'hearts')!,
      referenceCards().find((card) => card.face === '2' && card.suit === 'clubs')!,
      referenceCards().find((card) => card.face === '9' && card.suit === 'spades')!,
    ];
    const battlefieldCard = (card: typeof heart, row: 0 | 1) => ({
      card,
      position: { row, col: 0 },
      currentHp: card.value,
      faceDown: false,
    });

    const result = resolveReferenceCombat({
      specVersion: '2.0',
      modeClassicAces: false,
      modeClassicFaceCards: false,
      modeDamagePersistence: 'cumulative',
      attacker: battlefieldCard(spade, 0),
      front: battlefieldCard(heart, 0),
      back: battlefieldCard(number, 1),
      defenderLp: 20,
    });

    expect(result.combatEntry.totalLpDamage).toBe(10);
    expect(result.combatEntry.causeLabels).toEqual(['spadeDoubleLp']);
  });
});
