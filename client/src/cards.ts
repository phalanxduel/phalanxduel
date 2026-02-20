import type { BattlefieldCard, Card, Suit } from '@phalanx/shared';
import { RANK_VALUES } from '@phalanx/shared';

const SUIT_SYMBOLS: Record<Suit, string> = {
  spades: '\u2660',
  hearts: '\u2665',
  diamonds: '\u2666',
  clubs: '\u2663',
};

const SUIT_COLORS: Record<Suit, string> = {
  spades: '#8b95a5',
  hearts: '#c0392b',
  diamonds: '#c0392b',
  clubs: '#8b95a5',
};

export function suitSymbol(suit: Suit): string {
  return SUIT_SYMBOLS[suit];
}

export function suitColor(suit: Suit): string {
  return SUIT_COLORS[suit];
}

export function cardLabel(card: Card): string {
  return `${card.rank}${SUIT_SYMBOLS[card.suit]}`;
}

export function hpDisplay(bCard: BattlefieldCard): string {
  const maxHp = RANK_VALUES[bCard.card.rank] ?? 0;
  return `${bCard.currentHp}/${maxHp}`;
}

export function isWeapon(suit: Suit): boolean {
  return suit === 'spades' || suit === 'clubs';
}
