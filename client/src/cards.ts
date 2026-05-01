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

export function suitSymbol(suit: Suit): string {
  return SUIT_SYMBOLS[suit] ?? '';
}

export function suitColor(suit: Suit): string {
  return SUIT_COLORS[suit] ?? '';
}

export function cardLabel(card: Card): string {
  return `${card.face}${SUIT_SYMBOLS[card.suit] ?? ''}`;
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
