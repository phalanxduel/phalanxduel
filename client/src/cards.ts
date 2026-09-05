import type { BattlefieldCard, Card, Suit } from '@phalanxduel/shared';
import { getManifest } from './manifest.js';

// Suit display constants are client-side theme decisions — not server-driven.
const SUIT_SYMBOLS: Record<Suit, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};

const SUIT_COLORS: Record<Suit, string> = {
  spades: '#007aff', // Neon Offense
  hearts: '#ff2d55', // Neon Defense
  diamonds: '#ff2d55', // Neon Defense
  clubs: '#007aff', // Neon Offense
};

// Face card types per CardTypeSchema. Used as fallback before manifest loads.
const FACE_TYPES = new Set(['jack', 'queen', 'king', 'ace']);

// Secondary ornament only: the standard Latin/card rank remains primary.
// Greek numerals use the keraia mark (ʹ); stigma is retained for six.
const GREEK_NUMERALS: Record<number, string> = {
  1: 'Αʹ',
  2: 'Βʹ',
  3: 'Γʹ',
  4: 'Δʹ',
  5: 'Εʹ',
  6: 'ϛʹ',
  7: 'Ζʹ',
  8: 'Ηʹ',
  9: 'Θʹ',
  10: 'Ιʹ',
  11: 'ΙΑʹ',
  12: 'ΙΒʹ',
  13: 'ΙΓʹ',
};

const FACE_NUMBERS: Record<string, number> = {
  a: 1,
  ace: 1,
  j: 11,
  jack: 11,
  q: 12,
  queen: 12,
  k: 13,
  king: 13,
};

export function suitSymbol(suit: Suit): string {
  return SUIT_SYMBOLS[suit] ?? '';
}

export function suitColor(suit: Suit): string {
  return SUIT_COLORS[suit] ?? '';
}

export function cardLabel(card: Card): string {
  return `${card.face}${SUIT_SYMBOLS[card.suit] ?? ''}`;
}

/** Returns a quiet Greek-numeral flourish for the visual card treatment. */
export function greekRankLabel(face: string): string {
  const normalized = face.trim().toLowerCase();
  const value = FACE_NUMBERS[normalized] ?? Number.parseInt(normalized, 10);
  return Number.isInteger(value) ? (GREEK_NUMERALS[value] ?? '') : '';
}

export function hpDisplay(bCard: BattlefieldCard): string {
  const maxHp = bCard.card.value;
  return `${bCard.currentHp}/${maxHp}`;
}

export function isWeapon(suit: Suit): boolean {
  return suit === 'spades' || suit === 'clubs';
}

/**
 * True for face cards (Jack, Queen, King, Ace).
 * Uses the manifest cache when available for server-authoritative type data;
 * falls back to FACE_TYPES on cold start before the manifest loads.
 */
export function isFace(card: Card): boolean {
  const manifest = getManifest();
  if (manifest.length > 0) {
    const entry = manifest.find((c) => c.face === card.face && c.suit === card.suit);
    if (entry) return FACE_TYPES.has(entry.type);
  }
  return FACE_TYPES.has(card.type);
}
