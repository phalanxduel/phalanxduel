/**
 * Copyright © 2026 Mike Hall
 * Licensed under the GNU Affero General Public License v3.0.
 */

import type { Card, Suit } from '@phalanxduel/shared';

// Canonical Suit Order (Highest to Lowest): Spades > Hearts > Diamonds > Clubs
const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];

// Face values and J, Q, K sequence.
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K'];

/**
 * Creates a standard 52-card deck in canonical order.
 * Card IDs are NOT generated here; they are assigned upon drawing to maintain determinism.
 */
export function createDeck(): Omit<Card, 'id'>[] {
  const deck: Omit<Card, 'id'>[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      let type: Card['type'] = 'number';
      if (rank === 'A') type = 'ace';
      else if (rank === 'J') type = 'jack';
      else if (rank === 'Q') type = 'queen';
      else if (rank === 'K') type = 'king';

      const value =
        rank === 'A'
          ? 1
          : rank === 'T'
            ? 10
            : rank === 'J' || rank === 'Q' || rank === 'K'
              ? 11
              : Number(rank);

      deck.push({
        suit,
        face: rank,
        value,
        type,
      });
    }
  }
  return deck;
}

/**
 * Deterministic Fisher-Yates shuffle using a seeded PRNG.
 * Uses a simple mulberry32 algorithm for reproducibility.
 *
 * Seed 0 is reserved for an identity transform (returns unshuffled deck).
 */
export function shuffleDeck<T>(deck: T[], seed: number): T[] {
  if (seed === 0) {
    return [...deck];
  }

  const shuffled = [...deck];
  let s = seed >>> 0;
  for (let i = shuffled.length - 1; i > 0; i--) {
    // mulberry32 step
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    const rand = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    const j = Math.floor(rand * (i + 1));
    const si = shuffled[i],
      sj = shuffled[j];
    if (si !== undefined && sj !== undefined) {
      shuffled[i] = sj;
      shuffled[j] = si;
    }
  }
  return shuffled;
}
