import { describe, it, expect } from 'vitest';
import { ENGINE_VERSION, createDeck, shuffleDeck } from '../src/index';

describe('Engine', () => {
  describe('ENGINE_VERSION', () => {
    it('should export a valid semver version string', () => {
      // Arrange
      const semverPattern = /^\d+\.\d+\.\d+$/;

      // Act
      const version = ENGINE_VERSION;

      // Assert
      expect(version).toMatch(semverPattern);
      expect(version).toBe('0.1.0');
    });
  });

  describe('shuffleDeck', () => {
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
});
