/**
 * Copyright © 2026 Mike Hall
 * Licensed under the GNU General Public License v3.0.
 *
 * Phalanx System — Authoritative Schema v1.0
 * Defines the core deterministic types and the Phalanx: Duel format extension.
 */

import { z } from 'zod';

export const SCHEMA_VERSION = '1.0.0';

// --- 1. Core Phalanx System Types ---

export const SuitSchema = z.enum(['spades', 'hearts', 'diamonds', 'clubs']);

export const CardTypeSchema = z.enum(['number', 'ace', 'jack', 'queen', 'king', 'joker']);

/**
 * Standard Numeric Value Lookup (v1.0):
 * A=1, 2-9=face, T=10, J/Q/K=11
 */
export const RANK_VALUES: Record<string, number> = {
  A: 1,
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  T: 10,
  J: 11,
  Q: 11,
  K: 11,
};

/**
 * Phalanx Deterministic Card Definition
 * id format: [Timestamp]::[MatchID]::[PlayerID]::[TurnNumber]::[CardType]
 */
export const CardSchema = z.object({
  id: z.string(),
  suit: SuitSchema,
  face: z.string(),
  value: z.number().int().min(0),
  type: CardTypeSchema,
});

export const GridPositionSchema = z.object({
  row: z.number().int().min(0),
  col: z.number().int().min(0),
});

export const BattlefieldCardSchema = z.object({
  card: CardSchema,
  position: GridPositionSchema,
  currentHp: z.number().int().min(0),
  faceDown: z.boolean(),
});

// --- 2. Turn Lifecycle & Event Spans ---

/** 7-Phase Turn Lifecycle mandated by v1.0 RULES.md */
export const TurnPhaseSchema = z.enum([
  'StartTurn',
  'AttackPhase',
  'AttackResolution',
  'CleanupPhase',
  'ReinforcementPhase',
  'DrawPhase',
  'EndTurn',
]);

export const EventTypeSchema = z.enum([
  'span_started',
  'span_ended',
  'functional_update',
  'system_error',
]);

export const EventStatusSchema = z.enum(['ok', 'unrecoverable_error']);

/**
 * Hierarchical Event Model (Span-based)
 * Inspired by OpenTelemetry for deterministic auditing.
 */
export const PhalanxEventSchema = z.object({
  id: z.string(),
  parentId: z.string().optional(),
  type: EventTypeSchema,
  name: z.string(),
  timestamp: z.string().datetime(), // Frozen timestamp for the turn
  payload: z.record(z.string(), z.unknown()),
  status: EventStatusSchema.default('ok'),
});

// --- 3. Match Parameters & Modes ---

export const ClassicModeTypeSchema = z.enum(['strict', 'hybrid']);

export const MatchConfigClassicSchema = z.object({
  enabled: z.boolean(),
  mode: ClassicModeTypeSchema.default('strict'),
  battlefield: z.object({
    rows: z.number().int().default(2),
    columns: z.number().int().default(4),
  }),
  hand: z.object({
    maxHandSize: z.number().int().default(4),
  }),
  start: z.object({
    initialDraw: z.number().int().default(12),
  }),
  modes: z.object({
    classicAces: z.boolean().default(true),
    classicFaceCards: z.boolean().default(true),
    damagePersistence: z.enum(['classic', 'cumulative']).default('classic'),
  }),
  initiative: z.object({
    deployFirst: z.enum(['P1', 'P2']).default('P2'),
    attackFirst: z.enum(['P1', 'P2']).default('P1'),
  }),
  passRules: z.object({
    maxConsecutivePasses: z.number().int().default(3),
    maxTotalPassesPerPlayer: z.number().int().default(5),
  }),
});

/**
 * Authority Schema (Section 3)
 * Implements Strict and Hybrid parity rules.
 */
export const MatchParametersSchema = z
  .object({
    specVersion: z.literal('1.0'),
    classic: MatchConfigClassicSchema,

    // Top-level overrides/parameters
    rows: z.number().int().min(1).max(12),
    columns: z.number().int().min(1).max(4),
    maxHandSize: z.number().int().min(0),
    initialDraw: z.number().int().min(1),

    modeClassicAces: z.boolean(),
    modeClassicFaceCards: z.boolean(),
    modeDamagePersistence: z.enum(['classic', 'cumulative']),
    modeClassicDeployment: z.boolean(),

    modeSpecialStart: z.object({
      enabled: z.boolean(),
      noAttackCountsAsPassUntil: z.string().optional(),
    }),

    initiative: z.object({
      deployFirst: z.enum(['P1', 'P2']),
      attackFirst: z.enum(['P1', 'P2']),
    }),

    modePassRules: z.object({
      maxConsecutivePasses: z.number().int(),
      maxTotalPassesPerPlayer: z.number().int(),
    }),
  })
  .superRefine((data, ctx) => {
    // Global System Constraints (3.3)
    const totalSlots = data.rows * data.columns;
    if (totalSlots > 48) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Global Constraint: Total slots cannot exceed 48.',
        path: ['rows', 'columns'],
      });
    }

    if (data.maxHandSize > data.columns) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Global Constraint: maxHandSize cannot exceed columns.',
        path: ['maxHandSize'],
      });
    }

    const expectedInitialDraw = totalSlots + data.columns;
    if (data.initialDraw !== expectedInitialDraw) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Initial Draw Formula Mismatch: expected ${expectedInitialDraw}`,
        path: ['initialDraw'],
      });
    }

    // Strict Mode Parity (3.1.1)
    if (data.classic.enabled && data.classic.mode === 'strict') {
      const checks: [string, unknown, unknown][] = [
        ['rows', data.rows, data.classic.battlefield.rows],
        ['columns', data.columns, data.classic.battlefield.columns],
        ['maxHandSize', data.maxHandSize, data.classic.hand.maxHandSize],
        ['initialDraw', data.initialDraw, data.classic.start.initialDraw],
        ['modeClassicAces', data.modeClassicAces, data.classic.modes.classicAces],
        ['modeClassicFaceCards', data.modeClassicFaceCards, data.classic.modes.classicFaceCards],
        ['modeDamagePersistence', data.modeDamagePersistence, data.classic.modes.damagePersistence],
      ];

      for (const [path, top, classic] of checks) {
        if (top !== classic) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `STRICT_MODE_VIOLATION: ${path} must match classic block.`,
            path: [path],
          });
        }
      }
    }
  });

// --- 4. Game State & Duel Format ---

export const PlayerSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(50),
});

export const PlayerStateSchema = z.object({
  player: PlayerSchema,
  hand: z.array(CardSchema),
  battlefield: z.array(z.union([BattlefieldCardSchema, z.null()])),
  drawpile: z.array(CardSchema),
  discardPile: z.array(CardSchema),
  lifepoints: z.number().int().min(0),

  // Filtering fields
  handCount: z.number().int().optional(),
  drawpileCount: z.number().int().optional(),
});

/**
 * Phalanx: Duel Match State
 */
export const GameStateSchema = z.object({
  matchId: z.string().uuid(),
  specVersion: z.literal('1.0'),
  params: MatchParametersSchema,

  players: z.array(PlayerStateSchema).length(2),
  activePlayerIndex: z.number().int().min(0).max(1),
  turnNumber: z.number().int().min(0),

  // Replay Integrity
  preStateHash: z.string().optional(),
  lastTurnHash: z.string().optional(),

  outcome: z
    .object({
      winnerIndex: z.number().int(),
      victoryType: z.enum(['lpDepletion', 'cardDepletion', 'forfeit', 'passLimit']),
      turnNumber: z.number().int(),
    })
    .nullish(),
});

// --- 5. Game DSL & Atomic Payloads ---

/**
 * Phalanx DSL (Section 20.1)
 * Examples: "D:0:cardID", "A:0:3", "P", "R:cardID", "F"
 */
export const ActionDSLSchema = z.string().regex(/^(D:\d+:[\w:]+|A:\d+:\d+|P|R:[\w:]+|F)$/);

/**
 * Standard Action Schema
 */
export const ActionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('deploy'),
    playerIndex: z.number(),
    column: z.number(),
    cardId: z.string(),
  }),
  z.object({
    type: z.literal('attack'),
    playerIndex: z.number(),
    attackingColumn: z.number(),
    defendingColumn: z.number(),
  }),
  z.object({ type: z.literal('pass'), playerIndex: z.number() }),
  z.object({ type: z.literal('reinforce'), playerIndex: z.number(), cardId: z.string() }),
  z.object({ type: z.literal('forfeit'), playerIndex: z.number() }),
]);

/**
 * Atomic Turn Payload (Section 20.2)
 * The definitive response for cross-platform play.
 */
export const PhalanxTurnResultSchema = z.object({
  turnHash: z.string(),
  postState: GameStateSchema,
  events: z.array(PhalanxEventSchema),
});

// --- WebSocket Protocol Envelopes ---

export const ErrorResponseSchema = z.object({
  error: z.string(),
  code: z.string(),
  details: z.unknown().optional(),
});

export const MatchCreatedMessageSchema = z.object({
  type: z.literal('matchCreated'),
  matchId: z.string().uuid(),
  playerId: z.string().uuid(),
  playerIndex: z.number().int().min(0).max(1),
});

export const GameStateMessageSchema = z.object({
  type: z.literal('gameState'),
  matchId: z.string().uuid(),
  result: PhalanxTurnResultSchema,
  spectatorCount: z.number().int().min(0).optional(),
});

export const ServerMessageSchema = z.discriminatedUnion('type', [
  MatchCreatedMessageSchema,
  GameStateMessageSchema,
  z.object({ type: z.literal('actionError'), error: z.string(), code: z.string() }),
  z.object({ type: z.literal('matchError'), error: z.string(), code: z.string() }),
]);
