import { describe, it, expect } from 'vitest';
import { ENGINE_VERSION, createDeck, shuffleDeck } from '../src/index.ts';

describe('Engine', () => {
  describe('ENGINE_VERSION', () => {
    it('should export a valid semver version string', () => {
      // Arrange
      const semverPattern = /^\d+\.\d+\.\d+$/;

      // Act
      const version = ENGINE_VERSION;

      // Assert
      expect(version).toMatch(semverPattern);
      expect(version).toBe('0.2.3');
    });
  });

  describe('shuffleDeck', () => {
    it('should return identity transform for Seed 0 (testing purposes)', () => {
      // Arrange
      const deck = createDeck();

      // Act
      const shuffled = shuffleDeck(deck, 0);

      // Assert
      expect(shuffled).toEqual(deck);
    });

    it('should produce the same order for the same seed', () => {
      // Arrange
      const deck = createDeck();

      // Act
      const shuffled1 = shuffleDeck(deck, 42);
      const shuffled2 = shuffleDeck(deck, 42);

      // Assert
      expect(shuffled1).toEqual(shuffled2);
    });

    it('should produce different order for different seeds', () => {
      // Arrange
      const deck = createDeck();

      // Act
      const shuffled1 = shuffleDeck(deck, 42);
      const shuffled2 = shuffleDeck(deck, 99);

      // Assert
      expect(shuffled1).not.toEqual(shuffled2);
    });

    it('should not modify the original deck', () => {
      // Arrange
      const deck = createDeck();
      const original = [...deck];

      // Act
      shuffleDeck(deck, 42);

      // Assert
      expect(deck).toEqual(original);
    });
  });

  describe('createDeck', () => {
    it('should produce exactly 52 cards', () => {
      expect(createDeck().length).toBe(52);
    });

    it('should have 13 cards per suit', () => {
      const deck = createDeck();
      for (const suit of ['spades', 'hearts', 'diamonds', 'clubs'] as const) {
        expect(deck.filter((c) => c.suit === suit).length).toBe(13);
      }
    });

    it('should order suits as spades, hearts, diamonds, clubs', () => {
      const deck = createDeck();
      expect(deck[0]?.suit).toBe('spades');
      expect(deck[13]?.suit).toBe('hearts');
      expect(deck[26]?.suit).toBe('diamonds');
      expect(deck[39]?.suit).toBe('clubs');
    });

    it('Ace should have value 1 and type ace', () => {
      const ace = createDeck().find((c) => c.face === 'A');
      expect(ace?.value).toBe(1);
      expect(ace?.type).toBe('ace');
    });

    it('Ten should have value 10 and type number', () => {
      const ten = createDeck().find((c) => c.face === 'T');
      expect(ten?.value).toBe(10);
      expect(ten?.type).toBe('number');
    });

    it('Jack should have value 11 and type jack', () => {
      const jack = createDeck().find((c) => c.face === 'J');
      expect(jack?.value).toBe(11);
      expect(jack?.type).toBe('jack');
    });

    it('Queen should have value 11 and type queen', () => {
      const queen = createDeck().find((c) => c.face === 'Q');
      expect(queen?.value).toBe(11);
      expect(queen?.type).toBe('queen');
    });

    it('King should have value 11 and type king', () => {
      const king = createDeck().find((c) => c.face === 'K');
      expect(king?.value).toBe(11);
      expect(king?.type).toBe('king');
    });

    it('numeric ranks 2-9 should have matching numeric values and type number', () => {
      const deck = createDeck();
      for (let v = 2; v <= 9; v++) {
        const card = deck.find((c) => c.face === String(v) && c.suit === 'spades');
        expect(card?.value).toBe(v);
        expect(card?.type).toBe('number');
      }
    });

    it('shuffleDeck should produce all 52 cards (no duplicates, no missing)', () => {
      const deck = createDeck();
      const shuffled = shuffleDeck(deck, 42);
      expect(shuffled.length).toBe(52);
      for (const card of deck) {
        expect(shuffled.some((c) => c.suit === card.suit && c.face === card.face)).toBe(true);
      }
    });
  });
});
