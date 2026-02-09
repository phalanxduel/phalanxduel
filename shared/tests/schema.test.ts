import { describe, it, expect } from 'vitest';
import { CardSchema, PlayerSchema, HealthResponseSchema, SCHEMA_VERSION } from '../src/schema';

describe('Shared schemas', () => {
  describe('SCHEMA_VERSION', () => {
    it('should be a valid semver string', () => {
      // Arrange
      const semverPattern = /^\d+\.\d+\.\d+$/;

      // Act
      const version = SCHEMA_VERSION;

      // Assert
      expect(version).toMatch(semverPattern);
    });
  });

  describe('CardSchema', () => {
    it('should parse a valid card object', () => {
      // Arrange
      const input = { suit: 'spades', rank: 'A' };

      // Act
      const result = CardSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should reject an invalid suit', () => {
      // Arrange
      const input = { suit: 'wands', rank: '3' };

      // Act
      const result = CardSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(false);
    });
  });

  describe('PlayerSchema', () => {
    it('should parse a valid player object', () => {
      // Arrange
      const input = { id: '550e8400-e29b-41d4-a716-446655440000', name: 'Player 1' };

      // Act
      const result = PlayerSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(true);
    });
  });

  describe('HealthResponseSchema', () => {
    it('should parse a valid health response', () => {
      // Arrange
      const input = {
        status: 'ok',
        timestamp: '2024-01-01T00:00:00.000Z',
        version: '0.1.0',
      };

      // Act
      const result = HealthResponseSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(true);
    });
  });
});
