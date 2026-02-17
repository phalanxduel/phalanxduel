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
  GameOutcomeSchema,
  ActionSchema,
  ActionResultSchema,
  TransactionLogEntrySchema,
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
        lifepoints: 20,
      };
      expect(PlayerStateSchema.safeParse(input).success).toBe(true);
    });

    it('should reject negative lifepoints', () => {
      const input = {
        player: { id: '550e8400-e29b-41d4-a716-446655440000', name: 'Alice' },
        hand: [],
        battlefield: [null, null, null, null, null, null, null, null],
        drawpile: [],
        discardPile: [],
        lifepoints: -1,
      };
      expect(PlayerStateSchema.safeParse(input).success).toBe(false);
    });

    it('should reject missing lifepoints', () => {
      const input = {
        player: { id: '550e8400-e29b-41d4-a716-446655440000', name: 'Alice' },
        hand: [],
        battlefield: [null, null, null, null, null, null, null, null],
        drawpile: [],
        discardPile: [],
      };
      expect(PlayerStateSchema.safeParse(input).success).toBe(false);
    });
  });

  describe('GamePhaseSchema', () => {
    it('should accept all valid phases', () => {
      for (const phase of ['setup', 'deployment', 'combat', 'reinforcement', 'gameOver']) {
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
        lifepoints: 20,
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

    it('should accept a game state with transactionLog containing attack entry', () => {
      const emptyBattlefield = [null, null, null, null, null, null, null, null];
      const makePlayer = (id: string, name: string) => ({
        player: { id, name },
        hand: [],
        battlefield: emptyBattlefield,
        drawpile: [],
        discardPile: [],
        lifepoints: 15,
      });
      const state = {
        players: [
          makePlayer('550e8400-e29b-41d4-a716-446655440000', 'Alice'),
          makePlayer('550e8400-e29b-41d4-a716-446655440001', 'Bob'),
        ],
        activePlayerIndex: 0,
        phase: 'combat',
        turnNumber: 3,
        rngSeed: 42,
        transactionLog: [{
          sequenceNumber: 0,
          action: { type: 'attack', playerIndex: 0, attackerPosition: { row: 0, col: 2 }, targetPosition: { row: 0, col: 2 } },
          stateHashBefore: 'abc123',
          stateHashAfter: 'def456',
          timestamp: '2026-01-01T00:00:00.000Z',
          details: {
            type: 'attack',
            combat: {
              turnNumber: 3,
              attackerPlayerIndex: 0,
              attackerCard: { suit: 'hearts', rank: 'Q' },
              targetColumn: 2,
              baseDamage: 11,
              steps: [
                { target: 'frontCard', card: { suit: 'clubs', rank: '5' }, incomingDamage: 11, hpBefore: 5, effectiveHp: 5, absorbed: 5, overflow: 6, damage: 5, hpAfter: 0, destroyed: true },
                { target: 'backCard', card: { suit: 'spades', rank: '3' }, incomingDamage: 6, hpBefore: 3, effectiveHp: 3, absorbed: 3, overflow: 3, damage: 3, hpAfter: 0, destroyed: true },
                { target: 'playerLp', incomingDamage: 3, damage: 3, absorbed: 3, overflow: 0, lpBefore: 15, lpAfter: 12 },
              ],
              totalLpDamage: 3,
            },
            reinforcementTriggered: false,
            victoryTriggered: false,
          },
        }],
      };
      expect(GameStateSchema.safeParse(state).success).toBe(true);
    });

    it('should accept a game state with outcome', () => {
      const emptyBattlefield = [null, null, null, null, null, null, null, null];
      const makePlayer = (id: string, name: string) => ({
        player: { id, name },
        hand: [],
        battlefield: emptyBattlefield,
        drawpile: [],
        discardPile: [],
        lifepoints: 20,
      });
      const state = {
        players: [
          makePlayer('00000000-0000-0000-0000-000000000001', 'Alice'),
          makePlayer('00000000-0000-0000-0000-000000000002', 'Bob'),
        ],
        activePlayerIndex: 0,
        phase: 'gameOver',
        turnNumber: 15,
        rngSeed: 42,
        outcome: {
          winnerIndex: 0,
          victoryType: 'forfeit',
          turnNumber: 15,
        },
      };
      expect(GameStateSchema.safeParse(state).success).toBe(true);
    });
  });

  describe('GameOutcomeSchema', () => {
    it('should accept a valid game outcome', () => {
      const outcome = { winnerIndex: 1, victoryType: 'lpDepletion', turnNumber: 10 };
      expect(GameOutcomeSchema.safeParse(outcome).success).toBe(true);
    });

    it('should accept all victory types', () => {
      for (const vt of ['lpDepletion', 'cardDepletion', 'forfeit']) {
        const outcome = { winnerIndex: 0, victoryType: vt, turnNumber: 5 };
        expect(GameOutcomeSchema.safeParse(outcome).success).toBe(true);
      }
    });

    it('should reject invalid victory type', () => {
      const outcome = { winnerIndex: 0, victoryType: 'timeout', turnNumber: 5 };
      expect(GameOutcomeSchema.safeParse(outcome).success).toBe(false);
    });
  });

  describe('ActionSchema', () => {
    it('should accept a deploy action', () => {
      const action = {
        type: 'deploy',
        playerIndex: 0,
        card: { suit: 'hearts', rank: '5' },
        column: 1,
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

    it('should accept a forfeit action', () => {
      const action = { type: 'forfeit', playerIndex: 0 };
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
        lifepoints: 20,
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

  describe('TransactionLogEntrySchema', () => {
    const makeEntry = (details: unknown) => ({
      sequenceNumber: 0,
      action: { type: 'deploy', playerIndex: 0, card: { suit: 'hearts', rank: '5' }, column: 1 },
      stateHashBefore: 'hash-before',
      stateHashAfter: 'hash-after',
      timestamp: '2026-01-01T00:00:00.000Z',
      details,
    });

    it('should accept a deploy transaction entry', () => {
      const entry = makeEntry({ type: 'deploy', gridIndex: 0, phaseAfter: 'deployment' });
      expect(TransactionLogEntrySchema.safeParse(entry).success).toBe(true);
    });

    it('should accept an attack transaction entry', () => {
      const entry = {
        ...makeEntry({
          type: 'attack',
          combat: {
            turnNumber: 1,
            attackerPlayerIndex: 0,
            attackerCard: { suit: 'spades', rank: 'K' },
            targetColumn: 0,
            baseDamage: 11,
            steps: [{ target: 'playerLp', incomingDamage: 11, damage: 22, absorbed: 22, overflow: 0, lpBefore: 20, lpAfter: 0 }],
            totalLpDamage: 22,
          },
          reinforcementTriggered: false,
          victoryTriggered: true,
        }),
        action: { type: 'attack', playerIndex: 0, attackerPosition: { row: 0, col: 0 }, targetPosition: { row: 0, col: 0 } },
      };
      expect(TransactionLogEntrySchema.safeParse(entry).success).toBe(true);
    });

    it('should accept a pass transaction entry', () => {
      const entry = {
        ...makeEntry({ type: 'pass' }),
        action: { type: 'pass', playerIndex: 0 },
      };
      expect(TransactionLogEntrySchema.safeParse(entry).success).toBe(true);
    });

    it('should accept a reinforce transaction entry', () => {
      const entry = {
        ...makeEntry({ type: 'reinforce', column: 2, gridIndex: 6, cardsDrawn: 3, reinforcementComplete: true }),
        action: { type: 'reinforce', playerIndex: 1, card: { suit: 'clubs', rank: '4' } },
      };
      expect(TransactionLogEntrySchema.safeParse(entry).success).toBe(true);
    });

    it('should accept a forfeit transaction entry', () => {
      const entry = {
        ...makeEntry({ type: 'forfeit', winnerIndex: 1 }),
        action: { type: 'forfeit', playerIndex: 0 },
      };
      expect(TransactionLogEntrySchema.safeParse(entry).success).toBe(true);
    });

    it('should reject entry with missing sequenceNumber', () => {
      const entry = makeEntry({ type: 'pass' });
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { sequenceNumber: _seq, ...noSeq } = entry;
      expect(TransactionLogEntrySchema.safeParse(noSeq).success).toBe(false);
    });

    it('should reject entry with missing stateHashBefore', () => {
      const entry = makeEntry({ type: 'pass' });
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { stateHashBefore: _hash, ...noHash } = entry;
      expect(TransactionLogEntrySchema.safeParse(noHash).success).toBe(false);
    });

    it('should reject entry with invalid detail type', () => {
      const entry = makeEntry({ type: 'unknown' });
      expect(TransactionLogEntrySchema.safeParse(entry).success).toBe(false);
    });
  });
});
