import { describe, it, expect } from 'vitest';
import type { Card, BattlefieldCard, Suit } from '@phalanxduel/shared';
import { suitSymbol, suitColor, cardLabel, hpDisplay, isWeapon, isFace } from '../src/cards';

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: 'test-card-1',
    suit: 'spades',
    face: 'K',
    type: 'king',
    value: 10,
    ...overrides,
  };
}

function makeBfCard(currentHp: number, value: number): BattlefieldCard {
  return {
    card: makeCard({ value }),
    currentHp,
    position: { row: 0, col: 0 },
    faceDown: false,
  };
}

describe('suitSymbol', () => {
  it.each<[Suit, string]>([
    ['spades', '\u2660'],
    ['hearts', '\u2665'],
    ['diamonds', '\u2666'],
    ['clubs', '\u2663'],
  ])('returns %s → %s', (suit, expected) => {
    expect(suitSymbol(suit)).toBe(expected);
  });
});

describe('suitColor', () => {
  it('returns blue for spades', () => {
    expect(suitColor('spades')).toBe('#007aff');
  });
  it('returns red for hearts', () => {
    expect(suitColor('hearts')).toBe('#ff2d55');
  });
  it('returns red for diamonds', () => {
    expect(suitColor('diamonds')).toBe('#ff2d55');
  });
  it('returns blue for clubs', () => {
    expect(suitColor('clubs')).toBe('#007aff');
  });
});

describe('cardLabel', () => {
  it('returns face + suit symbol', () => {
    expect(cardLabel(makeCard({ face: 'K', suit: 'spades' }))).toBe('K\u2660');
  });
  it('works for number cards', () => {
    expect(cardLabel(makeCard({ face: '7', suit: 'hearts' }))).toBe('7\u2665');
  });
});

describe('hpDisplay', () => {
  it('returns currentHp/maxHp', () => {
    expect(hpDisplay(makeBfCard(3, 5))).toBe('3/5');
  });
  it('handles zero HP', () => {
    expect(hpDisplay(makeBfCard(0, 10))).toBe('0/10');
  });
});

describe('isWeapon', () => {
  it('returns true for spades', () => {
    expect(isWeapon('spades')).toBe(true);
  });
  it('returns true for clubs', () => {
    expect(isWeapon('clubs')).toBe(true);
  });
  it('returns false for hearts', () => {
    expect(isWeapon('hearts')).toBe(false);
  });
  it('returns false for diamonds', () => {
    expect(isWeapon('diamonds')).toBe(false);
  });
});

describe('isFace', () => {
  it.each(['jack', 'queen', 'king', 'ace'] as const)('returns true for %s', (type) => {
    expect(isFace(makeCard({ type }))).toBe(true);
  });
  it('returns false for number cards', () => {
    expect(isFace(makeCard({ type: 'number' }))).toBe(false);
  });
});
