import { describe, it, expect } from 'vitest';
import {
  CardSchema,
  PlayerSchema,
  HealthResponseSchema,
  SCHEMA_VERSION,
  DeckSchema,
  GridPositionSchema,
  BattlefieldCardSchema,
  BattlefieldSchema,
  PlayerStateSchema,
  GamePhaseSchema,
  GameStateSchema,
  ActionSchema,
  ActionResultSchema,
  RANK_VALUES,
} from '../src/schema';

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

  describe('RANK_VALUES', () => {
    it('should map Ace to 1', () => {
      expect(RANK_VALUES['A']).toBe(1);
    });

    it('should map numbered cards to face value', () => {
      for (let i = 2; i <= 9; i++) {
        expect(RANK_VALUES[String(i)]).toBe(i);
      }
      expect(RANK_VALUES['T']).toBe(10);
    });

    it('should map face cards to 11', () => {
      expect(RANK_VALUES['J']).toBe(11);
      expect(RANK_VALUES['Q']).toBe(11);
      expect(RANK_VALUES['K']).toBe(11);
    });
  });

  describe('DeckSchema', () => {
    it('should accept an array of valid cards', () => {
      const deck = [
        { suit: 'spades', rank: 'A' },
        { suit: 'hearts', rank: 'K' },
      ];
      expect(DeckSchema.safeParse(deck).success).toBe(true);
    });

    it('should reject an empty array', () => {
      expect(DeckSchema.safeParse([]).success).toBe(false);
    });
  });

  describe('GridPositionSchema', () => {
    it('should accept valid positions (row 0-1, col 0-3)', () => {
      expect(GridPositionSchema.safeParse({ row: 0, col: 0 }).success).toBe(true);
      expect(GridPositionSchema.safeParse({ row: 1, col: 3 }).success).toBe(true);
    });

    it('should reject out-of-bounds positions', () => {
      expect(GridPositionSchema.safeParse({ row: 2, col: 0 }).success).toBe(false);
      expect(GridPositionSchema.safeParse({ row: 0, col: 4 }).success).toBe(false);
    });
  });

  describe('BattlefieldCardSchema', () => {
    it('should accept a valid battlefield card', () => {
      const input = {
        card: { suit: 'diamonds', rank: '7' },
        position: { row: 0, col: 2 },
        currentHp: 7,
        faceDown: false,
      };
      expect(BattlefieldCardSchema.safeParse(input).success).toBe(true);
    });

    it('should reject negative HP', () => {
      const input = {
        card: { suit: 'diamonds', rank: '7' },
        position: { row: 0, col: 0 },
        currentHp: -1,
        faceDown: false,
      };
      expect(BattlefieldCardSchema.safeParse(input).success).toBe(false);
    });
  });

  describe('BattlefieldSchema', () => {
    it('should accept a full 8-slot grid', () => {
      const makeSlot = (col: number, row: number) => ({
        card: { suit: 'spades' as const, rank: '2' as const },
        position: { row, col },
        currentHp: 2,
        faceDown: false,
      });
      const grid = [
        makeSlot(0, 0), makeSlot(1, 0), makeSlot(2, 0), makeSlot(3, 0),
        makeSlot(0, 1), makeSlot(1, 1), makeSlot(2, 1), makeSlot(3, 1),
      ];
      expect(BattlefieldSchema.safeParse(grid).success).toBe(true);
    });

    it('should accept null slots (empty positions)', () => {
      const grid = [null, null, null, null, null, null, null, null];
      expect(BattlefieldSchema.safeParse(grid).success).toBe(true);
    });

    it('should reject grids with wrong length', () => {
      expect(BattlefieldSchema.safeParse([null]).success).toBe(false);
    });
  });

  describe('PlayerStateSchema', () => {
    it('should accept a valid player state', () => {
      const input = {
        player: { id: '550e8400-e29b-41d4-a716-446655440000', name: 'Alice' },
        hand: [{ suit: 'clubs', rank: 'J' }],
        battlefield: [null, null, null, null, null, null, null, null],
        drawpile: [],
        discardPile: [],
      };
      expect(PlayerStateSchema.safeParse(input).success).toBe(true);
    });
  });

  describe('GamePhaseSchema', () => {
    it('should accept all valid phases', () => {
      for (const phase of ['setup', 'deployment', 'combat', 'gameOver']) {
        expect(GamePhaseSchema.safeParse(phase).success).toBe(true);
      }
    });

    it('should reject invalid phases', () => {
      expect(GamePhaseSchema.safeParse('draw').success).toBe(false);
    });
  });

  describe('GameStateSchema', () => {
    it('should accept a valid game state', () => {
      const emptyBattlefield = [null, null, null, null, null, null, null, null];
      const makePlayer = (id: string, name: string) => ({
        player: { id, name },
        hand: [],
        battlefield: emptyBattlefield,
        drawpile: [],
        discardPile: [],
      });
      const state = {
        players: [
          makePlayer('550e8400-e29b-41d4-a716-446655440000', 'Alice'),
          makePlayer('550e8400-e29b-41d4-a716-446655440001', 'Bob'),
        ],
        activePlayerIndex: 0,
        phase: 'setup',
        turnNumber: 0,
        rngSeed: 42,
      };
      expect(GameStateSchema.safeParse(state).success).toBe(true);
    });
  });

  describe('ActionSchema', () => {
    it('should accept a deploy action', () => {
      const action = {
        type: 'deploy',
        playerIndex: 0,
        card: { suit: 'hearts', rank: '5' },
        position: { row: 0, col: 1 },
      };
      expect(ActionSchema.safeParse(action).success).toBe(true);
    });

    it('should accept an attack action', () => {
      const action = {
        type: 'attack',
        playerIndex: 1,
        attackerPosition: { row: 0, col: 0 },
        targetPosition: { row: 0, col: 2 },
      };
      expect(ActionSchema.safeParse(action).success).toBe(true);
    });

    it('should accept a pass action', () => {
      const action = { type: 'pass', playerIndex: 1 };
      expect(ActionSchema.safeParse(action).success).toBe(true);
    });

    it('should reject an unknown action type', () => {
      const action = { type: 'draw', playerIndex: 0 };
      expect(ActionSchema.safeParse(action).success).toBe(false);
    });
  });

  describe('ActionResultSchema', () => {
    it('should accept a success result', () => {
      const emptyBattlefield = [null, null, null, null, null, null, null, null];
      const makePlayer = (id: string, name: string) => ({
        player: { id, name },
        hand: [],
        battlefield: emptyBattlefield,
        drawpile: [],
        discardPile: [],
      });
      const result = {
        ok: true,
        state: {
          players: [
            makePlayer('550e8400-e29b-41d4-a716-446655440000', 'A'),
            makePlayer('550e8400-e29b-41d4-a716-446655440001', 'B'),
          ],
          activePlayerIndex: 0,
          phase: 'combat',
          turnNumber: 1,
          rngSeed: 42,
        },
      };
      expect(ActionResultSchema.safeParse(result).success).toBe(true);
    });

    it('should accept an error result', () => {
      const result = { ok: false, error: 'Invalid target', code: 'INVALID_TARGET' };
      expect(ActionResultSchema.safeParse(result).success).toBe(true);
    });
  });
});
