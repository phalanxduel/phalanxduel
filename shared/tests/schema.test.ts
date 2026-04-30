import { describe, it, expect } from 'vitest';
import {
  CardSchema,
  SCHEMA_VERSION,
  GridPositionSchema,
  BattlefieldSchema,
  GamePhaseSchema,
  ActionSchema,
  MatchParametersSchema,
  CreateMatchParamsPartialSchema,
  ClientMessageSchema,
  RANK_VALUES,
  PhalanxTurnResultSchema,
  TransactionLogEntrySchema,
  normalizeCreateMatchParams,
} from '../src/schema';

describe('Shared schemas', () => {
  describe('SCHEMA_VERSION', () => {
    it('should be a valid semver string', () => {
      // eslint-disable-next-line security/detect-unsafe-regex
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
      expect(RANK_VALUES.A).toBe(1);
      expect(RANK_VALUES['2']).toBe(2);
      expect(RANK_VALUES.T).toBe(10);
      expect(RANK_VALUES.J).toBe(11);
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

  describe('ClientMessageSchema createMatch matchParams', () => {
    it('should accept createMatch with no matchParams', () => {
      const result = ClientMessageSchema.safeParse({
        type: 'createMatch',
        playerName: 'Alice',
        msgId: '11111111-1111-4111-8111-111111111111',
      });
      expect(result.success).toBe(true);
    });

    it('should accept createMatch with partial matchParams and preserve provided fields', () => {
      const result = ClientMessageSchema.safeParse({
        type: 'createMatch',
        playerName: 'Alice',
        msgId: '11111111-1111-4111-8111-111111111111',
        matchParams: {
          rows: 3,
          columns: 5,
        },
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toMatchObject({
          type: 'createMatch',
          matchParams: {
            rows: 3,
            columns: 5,
          },
        });
      }
    });

    it('should accept nested canonical matchParams fields on createMatch', () => {
      const result = ClientMessageSchema.safeParse({
        type: 'createMatch',
        playerName: 'Alice',
        msgId: '11111111-1111-4111-8111-111111111111',
        matchParams: {
          classic: {
            mode: 'hybrid',
            initiative: { deployFirst: 'P1' },
          },
          initiative: {
            attackFirst: 'P2',
          },
          modePassRules: {
            maxTotalPassesPerPlayer: 7,
          },
        },
      });
      expect(result.success).toBe(true);
    });

    it('should reject out-of-range matchParams fields', () => {
      const invalidMessages = [
        { matchParams: { rows: 0 } },
        { matchParams: { columns: 13 } },
        { matchParams: { maxHandSize: -1 } },
        { matchParams: { initialDraw: 0 } },
        { matchParams: { initiative: { deployFirst: 'P3' } } },
      ];

      for (const payload of invalidMessages) {
        const result = ClientMessageSchema.safeParse({
          type: 'createMatch',
          playerName: 'Alice',
          msgId: '11111111-1111-4111-8111-111111111111',
          ...payload,
        });
        expect(result.success).toBe(false);
      }
    });

    it('should reject reliable gameplay/session messages without msgId', () => {
      const missingMsgIdPayloads = [
        {
          type: 'createMatch',
          playerName: 'Alice',
        },
        {
          type: 'joinMatch',
          matchId: '11111111-1111-4111-8111-111111111111',
          playerName: 'Bob',
        },
        {
          type: 'rejoinMatch',
          matchId: '11111111-1111-4111-8111-111111111111',
          playerId: '22222222-2222-4222-8222-222222222222',
        },
        {
          type: 'watchMatch',
          matchId: '11111111-1111-4111-8111-111111111111',
        },
        {
          type: 'authenticate',
          token: 'jwt-token',
        },
        {
          type: 'action',
          matchId: '11111111-1111-4111-8111-111111111111',
          action: {
            type: 'pass',
            playerIndex: 0,
            timestamp: '2026-01-01T00:00:00.000Z',
          },
        },
      ];

      for (const payload of missingMsgIdPayloads) {
        expect(ClientMessageSchema.safeParse(payload).success).toBe(false);
      }
    });

    it('should accept optional telemetry context on client messages', () => {
      const result = ClientMessageSchema.safeParse({
        type: 'action',
        matchId: '11111111-1111-4111-8111-111111111111',
        msgId: '11111111-1111-4111-8111-111111111111',
        action: {
          type: 'pass',
          playerIndex: 0,
          timestamp: '2026-01-01T00:00:00.000Z',
        },
        telemetry: {
          traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
          tracestate: 'rojo=00f067aa0ba902b7',
          baggage: 'qa.run_id=qa-123',
          qaRunId: 'qa-123',
          originService: 'phx-qa-api-playthrough',
        },
      });

      expect(result.success).toBe(true);
    });
  });

  describe('MatchParametersSchema — superRefine', () => {
    /** Valid baseline that passes all constraints */
    function validParams(overrides: Record<string, unknown> = {}) {
      return {
        specVersion: '1.0' as const,
        rows: 2,
        columns: 4,
        maxHandSize: 4,
        initialDraw: 12, // rows * columns + columns = 8 + 4
        modeClassicAces: true,
        modeClassicFaceCards: true,
        modeDamagePersistence: 'classic' as const,
        modeClassicDeployment: true,
        modeQuickStart: false,
        modeSpecialStart: { enabled: false },
        initiative: { deployFirst: 'P2' as const, attackFirst: 'P1' as const },
        modePassRules: { maxConsecutivePasses: 3, maxTotalPassesPerPlayer: 5 },
        classic: {
          enabled: true,
          mode: 'strict' as const,
          battlefield: { rows: 2, columns: 4 },
          hand: { maxHandSize: 4 },
          start: { initialDraw: 12 },
          modes: {
            classicAces: true,
            classicFaceCards: true,
            damagePersistence: 'classic' as const,
          },
          initiative: { deployFirst: 'P2' as const, attackFirst: 'P1' as const },
          passRules: { maxConsecutivePasses: 3, maxTotalPassesPerPlayer: 5 },
        },
        ...overrides,
      };
    }

    it('should accept valid classic strict parameters', () => {
      const result = MatchParametersSchema.safeParse(validParams());
      expect(result.success).toBe(true);
    });

    it('should reject the 12x4 boundary when the required initial draw violates scarcity', () => {
      const result = MatchParametersSchema.safeParse(
        validParams({
          rows: 12,
          columns: 4,
          initialDraw: 52,
          classic: {
            enabled: false,
            mode: 'hybrid',
            battlefield: { rows: 12, columns: 4 },
            hand: { maxHandSize: 4 },
            start: { initialDraw: 52 },
            modes: { classicAces: true, classicFaceCards: true, damagePersistence: 'classic' },
            initiative: { deployFirst: 'P2', attackFirst: 'P1' },
            passRules: { maxConsecutivePasses: 3, maxTotalPassesPerPlayer: 5 },
          },
        }),
      );
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message);
        expect(messages).toContain(
          'Card Scarcity Invariant violated: initialDraw cannot exceed 48.',
        );
      }
    });

    it('should reject maxHandSize > columns', () => {
      const result = MatchParametersSchema.safeParse(
        validParams({
          maxHandSize: 5,
          columns: 4,
          classic: {
            enabled: false,
            mode: 'hybrid',
            battlefield: { rows: 2, columns: 4 },
            hand: { maxHandSize: 5 },
            start: { initialDraw: 12 },
            modes: { classicAces: true, classicFaceCards: true, damagePersistence: 'classic' },
            initiative: { deployFirst: 'P2', attackFirst: 'P1' },
            passRules: { maxConsecutivePasses: 3, maxTotalPassesPerPlayer: 5 },
          },
        }),
      );
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message);
        expect(messages).toContain('Global Constraint: maxHandSize cannot exceed columns.');
      }
    });

    it('should reject initialDraw mismatch', () => {
      const result = MatchParametersSchema.safeParse(
        validParams({
          initialDraw: 10, // expected: 2*4 + 4 = 12
          classic: {
            enabled: false,
            mode: 'hybrid',
            battlefield: { rows: 2, columns: 4 },
            hand: { maxHandSize: 4 },
            start: { initialDraw: 10 },
            modes: { classicAces: true, classicFaceCards: true, damagePersistence: 'classic' },
            initiative: { deployFirst: 'P2', attackFirst: 'P1' },
            passRules: { maxConsecutivePasses: 3, maxTotalPassesPerPlayer: 5 },
          },
        }),
      );
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message);
        expect(messages.some((m) => m.includes('Initial Draw Formula Mismatch'))).toBe(true);
      }
    });

    it('should reject strict mode parity violations', () => {
      const result = MatchParametersSchema.safeParse(
        validParams({
          rows: 2,
          classic: {
            enabled: true,
            mode: 'strict',
            battlefield: { rows: 1, columns: 4 }, // mismatch: rows 1 vs top-level 2
            hand: { maxHandSize: 4 },
            start: { initialDraw: 12 },
            modes: { classicAces: true, classicFaceCards: true, damagePersistence: 'classic' },
            initiative: { deployFirst: 'P2', attackFirst: 'P1' },
            passRules: { maxConsecutivePasses: 3, maxTotalPassesPerPlayer: 5 },
          },
        }),
      );
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message);
        expect(messages.some((m) => m.includes('STRICT_MODE_VIOLATION'))).toBe(true);
      }
    });

    it('should reject strict mode parity violations for initiative and pass rules', () => {
      const result = MatchParametersSchema.safeParse(
        validParams({
          initiative: { deployFirst: 'P1', attackFirst: 'P1' },
          modePassRules: { maxConsecutivePasses: 4, maxTotalPassesPerPlayer: 5 },
          classic: {
            enabled: true,
            mode: 'strict',
            battlefield: { rows: 2, columns: 4 },
            hand: { maxHandSize: 4 },
            start: { initialDraw: 12 },
            modes: { classicAces: true, classicFaceCards: true, damagePersistence: 'classic' },
            initiative: { deployFirst: 'P2', attackFirst: 'P1' },
            passRules: { maxConsecutivePasses: 3, maxTotalPassesPerPlayer: 5 },
          },
        }),
      );
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message);
        expect(messages).toContain(
          'STRICT_MODE_VIOLATION: initiative.deployFirst must match classic block.',
        );
        expect(messages).toContain(
          'STRICT_MODE_VIOLATION: modePassRules.maxConsecutivePasses must match classic block.',
        );
      }
    });

    it('should reject strict mode with modeQuickStart: true', () => {
      const result = MatchParametersSchema.safeParse(validParams({ modeQuickStart: true }));
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message);
        expect(messages).toContain(
          'STRICT_MODE_VIOLATION: modeQuickStart must match classic block.',
        );
      }
    });

    it('should permit modeQuickStart: true in hybrid mode', () => {
      const result = MatchParametersSchema.safeParse(
        validParams({
          modeQuickStart: true,
          classic: {
            enabled: true,
            mode: 'hybrid',
            battlefield: { rows: 2, columns: 4 },
            hand: { maxHandSize: 4 },
            start: { initialDraw: 12 },
            modes: { classicAces: true, classicFaceCards: true, damagePersistence: 'classic' },
            initiative: { deployFirst: 'P2', attackFirst: 'P1' },
            passRules: { maxConsecutivePasses: 3, maxTotalPassesPerPlayer: 5 },
          },
        }),
      );
      expect(result.success).toBe(true);
    });

    it('should reject card scarcity invariant violations', () => {
      const result = MatchParametersSchema.safeParse(
        validParams({
          rows: 12,
          columns: 4,
          initialDraw: 52,
          classic: {
            enabled: false,
            mode: 'hybrid',
            battlefield: { rows: 12, columns: 4 },
            hand: { maxHandSize: 4 },
            start: { initialDraw: 52 },
            modes: { classicAces: true, classicFaceCards: true, damagePersistence: 'classic' },
            initiative: { deployFirst: 'P2', attackFirst: 'P1' },
            passRules: { maxConsecutivePasses: 3, maxTotalPassesPerPlayer: 5 },
          },
        }),
      );
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message);
        expect(messages).toContain(
          'Card Scarcity Invariant violated: initialDraw cannot exceed 48.',
        );
      }
    });

    it('should skip strict parity checks when classic is disabled', () => {
      const result = MatchParametersSchema.safeParse(
        validParams({
          classic: {
            enabled: false,
            mode: 'strict',
            battlefield: { rows: 1, columns: 4 }, // mismatch but classic disabled
            hand: { maxHandSize: 4 },
            start: { initialDraw: 12 },
            modes: { classicAces: true, classicFaceCards: true, damagePersistence: 'classic' },
            initiative: { deployFirst: 'P2', attackFirst: 'P1' },
            passRules: { maxConsecutivePasses: 3, maxTotalPassesPerPlayer: 5 },
          },
        }),
      );
      expect(result.success).toBe(true);
    });
  });

  describe('normalizeCreateMatchParams', () => {
    it('should fill omitted nested fields from defaults', () => {
      const result = normalizeCreateMatchParams({
        classic: {
          mode: 'hybrid',
        },
        initiative: { deployFirst: 'P1' },
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.classic.mode).toBe('hybrid');
        expect(result.data.initiative.deployFirst).toBe('P1');
        expect(result.data.initiative.attackFirst).toBe('P1');
        expect(result.data.modePassRules.maxConsecutivePasses).toBe(3);
      }
    });

    it('should reject unsupported canonical values through the shared normalization path', () => {
      const shapeResult = CreateMatchParamsPartialSchema.safeParse({
        initiative: { deployFirst: 'P1' },
        classic: {
          mode: 'strict',
          initiative: { deployFirst: 'P2' },
        },
      });
      expect(shapeResult.success).toBe(true);

      const result = normalizeCreateMatchParams({
        initiative: { deployFirst: 'P1' },
        classic: {
          mode: 'strict',
          initiative: { deployFirst: 'P2' },
        },
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map((issue) => issue.message);
        expect(messages).toContain(
          'STRICT_MODE_VIOLATION: initiative.deployFirst must match classic block.',
        );
      }
    });
  });
});

describe('TransactionLogEntrySchema', () => {
  it('preserves turnHash in parsed output when field is present', () => {
    const result = TransactionLogEntrySchema.partial().safeParse({
      turnHash: 'a'.repeat(64),
    });
    expect(result.success).toBe(true);
    expect((result.data as { turnHash?: string }).turnHash).toBe('a'.repeat(64));
  });

  it('accepts a valid entry without turnHash (field is optional)', () => {
    const result = TransactionLogEntrySchema.partial().safeParse({});
    expect(result.success).toBe(true);
    expect((result.data as { turnHash?: string }).turnHash).toBeUndefined();
  });

  it('rejects a non-string turnHash', () => {
    const result = TransactionLogEntrySchema.partial().safeParse({
      turnHash: 12345,
    });
    expect(result.success).toBe(false);
  });
});

describe('PhalanxTurnResultSchema', () => {
  it('turnHash is absent from parsed output before schema change (red step verification)', () => {
    // Zod strips unknown fields silently — so we verify by checking the parsed output,
    // not the parse success. Before turnHash is in the schema, result.data.turnHash
    // will be undefined even when the input has it. This is the correct red step.
    // All fields are optional via .partial() so no UUID fields needed.
    const result = PhalanxTurnResultSchema.partial().safeParse({
      turnHash: 'a'.repeat(64),
    });
    expect(result.success).toBe(true);
    // This assertion FAILS before the field is in the schema (stripped by Zod):
    expect((result.data as { turnHash?: string }).turnHash).toBe('a'.repeat(64));
  });

  it('accepts a valid result without turnHash', () => {
    const result = PhalanxTurnResultSchema.partial().safeParse({});
    expect(result.success).toBe(true);
    expect((result.data as { turnHash?: string }).turnHash).toBeUndefined();
  });

  it('rejects a non-string turnHash', () => {
    const result = PhalanxTurnResultSchema.partial().safeParse({
      turnHash: 12345,
    });
    expect(result.success).toBe(false);
  });
});
