import { describe, it, expect } from 'vitest';
import {
  CardSchema,
  SCHEMA_VERSION,
  GridPositionSchema,
  BattlefieldSchema,
  GamePhaseSchema,
  ActionSchema,
  RANK_VALUES,
} from '../src/schema.ts';

describe('Shared schemas', () => {
  describe('SCHEMA_VERSION', () => {
    it('should be a valid semver string', () => {
      const semverPattern = /^\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?$/;
      expect(SCHEMA_VERSION).toMatch(semverPattern);
    });
  });

  describe('CardSchema', () => {
    it('should parse a valid card object', () => {
      const input = {
        id: 'test-id',
        suit: 'spades',
        face: 'A',
        value: 1,
        type: 'ace',
      };
      const result = CardSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe('RANK_VALUES', () => {
    it('should map standard values correctly', () => {
      expect(RANK_VALUES['A']).toBe(1);
      expect(RANK_VALUES['2']).toBe(2);
      expect(RANK_VALUES['T']).toBe(10);
      expect(RANK_VALUES['J']).toBe(11);
    });
  });

  describe('GridPositionSchema', () => {
    it('should accept valid positions', () => {
      expect(GridPositionSchema.safeParse({ row: 0, col: 0 }).success).toBe(true);
      expect(GridPositionSchema.safeParse({ row: 1, col: 3 }).success).toBe(true);
    });
  });

  describe('BattlefieldSchema', () => {
    it('should accept an 8-slot array', () => {
      const grid = Array(8).fill(null);
      expect(BattlefieldSchema.safeParse(grid).success).toBe(true);
    });
  });

  describe('GamePhaseSchema', () => {
    it('should accept all v1.0 phases', () => {
      const phases = [
        'StartTurn',
        'AttackPhase',
        'AttackResolution',
        'CleanupPhase',
        'ReinforcementPhase',
        'DrawPhase',
        'EndTurn',
        'gameOver',
      ];
      for (const p of phases) {
        expect(GamePhaseSchema.safeParse(p).success).toBe(true);
      }
    });
  });

  describe('ActionSchema', () => {
    it('should parse an attack action', () => {
      const action = {
        type: 'attack',
        playerIndex: 0,
        attackingColumn: 0,
        defendingColumn: 0,
        timestamp: '2026-01-01T00:00:00.000Z',
      };
      expect(ActionSchema.safeParse(action).success).toBe(true);
    });
  });
});
