/**
 * Copyright © 2026 Mike Hall
 * Licensed under the GNU General Public License v3.0.
 */

import type { Card, Suit, Rank } from '@phalanxduel/shared';

const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K'];

/**
 * PHX-CARDS-001: Create a standard 52-card deck (no Jokers in base rules).
 */
export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank });
    }
  }
  return deck;
}

/**
 * Deterministic Fisher-Yates shuffle using a seeded PRNG.
 * Uses a simple mulberry32 algorithm for reproducibility.
 */
export function shuffleDeck(deck: Card[], seed: number): Card[] {
  const shuffled = [...deck];
  let s = seed >>> 0;
  for (let i = shuffled.length - 1; i > 0; i--) {
    // mulberry32 step
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    const rand = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    const j = Math.floor(rand * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }
  return shuffled;
}
