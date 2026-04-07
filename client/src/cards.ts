import type { BattlefieldCard, Card, Suit } from '@phalanxduel/shared';

const SUIT_SYMBOLS: Record<Suit, string> = {
  spades: '\u2660',
  hearts: '\u2665',
  diamonds: '\u2666',
  clubs: '\u2663',
};

const SUIT_COLORS: Record<Suit, string> = {
  spades: '#3E82FF', // Kinetic Blue (Offense)
  hearts: '#FF3E3E', // Tactical Red (Defense)
  diamonds: '#FF3E3E', // Tactical Red (Defense)
  clubs: '#3E82FF', // Kinetic Blue (Offense)
};

export function suitSymbol(suit: Suit): string {
  return SUIT_SYMBOLS[suit];
}

export function suitColor(suit: Suit): string {
  return SUIT_COLORS[suit];
}

export function cardLabel(card: Card): string {
  return `${card.face}${SUIT_SYMBOLS[card.suit]}`;
}

export function hpDisplay(bCard: BattlefieldCard): string {
  const maxHp = bCard.card.value;
  return `${bCard.currentHp}/${maxHp}`;
}

export function isWeapon(suit: Suit): boolean {
  return suit === 'spades' || suit === 'clubs';
}

export function isFace(card: Card): boolean {
  return ['jack', 'queen', 'king', 'ace'].includes(card.type);
}
