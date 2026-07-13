import { describe, expect, it } from 'vitest';
import type { BattlefieldCard, CardType } from '@phalanxduel/shared';
import { referenceCards } from '../src/assurance/combat-proof-domain.ts';
import {
  resolveReferenceCardBoundary,
  resolveReferenceCardTransition,
  resolveReferencePlayerBoundary,
} from '../src/assurance/combat-reference.ts';
import {
  resolveCardBoundary,
  resolveCardTransition,
  resolvePlayerBoundary,
} from '../src/combat-math.ts';

const ATTACKER_TYPES: CardType[] = ['ace', 'number', 'jack', 'queen', 'king'];
const TRANSITION_MODES = ATTACKER_TYPES.flatMap((attackerType) =>
  [false, true].flatMap((isFrontRank) =>
    [false, true].flatMap((modeClassicAces) =>
      [false, true].flatMap((modeClassicFaceCards) =>
        (['classic', 'cumulative'] as const).map((modeDamagePersistence) => ({
          attackerType,
          isFrontRank,
          modeClassicAces,
          modeClassicFaceCards,
          modeDamagePersistence,
        })),
      ),
    ),
  ),
);

describe('fairness-critical mutation sensitivity', () => {
  it('matches the independent card-transition relation over a branch-complete basis', () => {
    const cards = referenceCards();
    const targets = [
      cards.find((card) => card.type === 'ace')!,
      cards.find((card) => card.type === 'number' && card.value === 7)!,
      cards.find((card) => card.type === 'jack')!,
      cards.find((card) => card.type === 'queen')!,
      cards.find((card) => card.type === 'king')!,
    ];
    const targetStates = targets.flatMap((card) =>
      Array.from(
        { length: card.value },
        (_, hpIndex): BattlefieldCard => ({
          card,
          position: { row: 0, col: 0 },
          currentHp: hpIndex + 1,
          faceDown: false,
        }),
      ),
    );
    let comparisons = 0;

    for (const target of targetStates) {
      for (const modes of TRANSITION_MODES) {
        for (let incomingDamage = 0; incomingDamage <= 22; incomingDamage += 1) {
          expect(resolveCardTransition(target, incomingDamage, modes.isFrontRank, modes)).toEqual(
            resolveReferenceCardTransition(
              target,
              incomingDamage,
              modes.attackerType,
              modes.isFrontRank,
              { ...modes, specVersion: '3.0' },
            ),
          );
          comparisons += 1;
        }
      }
    }

    expect(comparisons).toBe(75_440);
  });

  it('matches every finite card-boundary predicate and arithmetic result', () => {
    let comparisons = 0;
    for (const specVersion of ['3.0', '2.0', '1.0'] as const) {
      for (let carryover = 0; carryover <= 20; carryover += 1) {
        for (let diamondShield = 0; diamondShield <= 11; diamondShield += 1) {
          for (const clubEligible of [false, true]) {
            const input = { carryover, diamondShield, clubEligible, specVersion };
            expect(resolveCardBoundary(input)).toEqual(resolveReferenceCardBoundary(input));
            comparisons += 1;
          }
        }
      }
    }
    expect(comparisons).toBe(1_512);
  });

  it('matches every finite player-boundary predicate and arithmetic result', () => {
    let comparisons = 0;
    for (const specVersion of ['3.0', '2.0', '1.0'] as const) {
      for (let carryover = 0; carryover <= 40; carryover += 1) {
        for (let heartShield = 0; heartShield <= 11; heartShield += 1) {
          for (const spadeWeapon of [false, true]) {
            const input = { carryover, heartShield, spadeWeapon, specVersion };
            expect(resolvePlayerBoundary(input)).toEqual(resolveReferencePlayerBoundary(input));
            comparisons += 1;
          }
        }
      }
    }
    expect(comparisons).toBe(2_952);
  });
});
