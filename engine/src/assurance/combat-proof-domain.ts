/** Independent finite domain for the combat reference verifier. */

import type { BattlefieldCard, Card, CardType, Suit } from '@phalanxduel/shared';
import type { ReferenceCombatModes } from './combat-reference.js';

const SUITS: readonly Suit[] = ['clubs', 'diamonds', 'hearts', 'spades'];
const RANKS: ReadonlyArray<{ face: string; value: number; type: CardType }> = [
  { face: 'A', value: 1, type: 'ace' },
  { face: '2', value: 2, type: 'number' },
  { face: '3', value: 3, type: 'number' },
  { face: '4', value: 4, type: 'number' },
  { face: '5', value: 5, type: 'number' },
  { face: '6', value: 6, type: 'number' },
  { face: '7', value: 7, type: 'number' },
  { face: '8', value: 8, type: 'number' },
  { face: '9', value: 9, type: 'number' },
  { face: 'T', value: 10, type: 'number' },
  { face: 'J', value: 11, type: 'jack' },
  { face: 'Q', value: 11, type: 'queen' },
  { face: 'K', value: 11, type: 'king' },
];

export const COMBAT_PROOF_DOMAIN_VERSION = 1;

export function referenceCards(): Card[] {
  const cards: Card[] = [];
  for (const rank of RANKS) {
    for (const suit of SUITS) {
      cards.push({
        id: `proof-${rank.face}-${suit}`,
        suit,
        face: rank.face,
        value: rank.value,
        type: rank.type,
      });
    }
  }
  return cards;
}

export function referenceBattlefieldStates(rank: 0 | 1): BattlefieldCard[] {
  return referenceCards().flatMap((card) =>
    Array.from({ length: card.value }, (_, hpOffset) => ({
      card,
      position: { row: rank, col: 0 },
      currentHp: hpOffset + 1,
      faceDown: false,
    })),
  );
}

export function referenceModeDomain(): ReferenceCombatModes[] {
  const result: ReferenceCombatModes[] = [];
  for (const specVersion of ['3.0', '2.0', '1.0'] as const) {
    for (const modeClassicAces of [false, true]) {
      for (const modeClassicFaceCards of [false, true]) {
        for (const modeDamagePersistence of ['classic', 'cumulative'] as const) {
          result.push({
            specVersion,
            modeClassicAces,
            modeClassicFaceCards,
            modeDamagePersistence,
          });
        }
      }
    }
  }
  return result;
}

export function referenceLpDomain(): number[] {
  return Array.from({ length: 501 }, (_, value) => value);
}
