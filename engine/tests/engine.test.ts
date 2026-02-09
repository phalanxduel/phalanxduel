import { describe, it, expect } from 'vitest';
import { ENGINE_VERSION } from '../src/index';

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
});
