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

/**
 * ID-less card representation for the drawpile.
 * IDs are generated at draw-time to ensure determinism.
 */
export const PartialCardSchema = CardSchema.omit({ id: true });

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

export const BattlefieldSchema = z.array(z.union([BattlefieldCardSchema, z.null()])).length(8);

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

export const GamePhaseSchema = z.union([TurnPhaseSchema, z.literal('gameOver')]);

export const VictoryTypeSchema = z.enum(['lpDepletion', 'cardDepletion', 'forfeit', 'passLimit']);

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

export const GameOptionsSchema = z.object({
  damageMode: z.enum(['classic', 'cumulative']).default('classic'),
  startingLifepoints: z.number().int().default(20),
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
    timestamp: z.string().datetime(),
  }),
  z.object({
    type: z.literal('attack'),
    playerIndex: z.number(),
    attackingColumn: z.number(),
    defendingColumn: z.number(),
    timestamp: z.string().datetime(),
  }),
  z.object({ type: z.literal('pass'), playerIndex: z.number(), timestamp: z.string().datetime() }),
  z.object({
    type: z.literal('reinforce'),
    playerIndex: z.number(),
    cardId: z.string(),
    timestamp: z.string().datetime(),
  }),
  z.object({
    type: z.literal('forfeit'),
    playerIndex: z.number(),
    timestamp: z.string().datetime(),
  }),
  z.object({
    type: z.literal('system:init'),
    timestamp: z.string().datetime(),
  }),
]);

// --- 4. Game State & Duel Format ---

export const PlayerSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(50),
});

export const PlayerStateSchema = z.object({
  player: PlayerSchema,
  hand: z.array(CardSchema),
  battlefield: z.array(z.union([BattlefieldCardSchema, z.null()])),
  drawpile: z.array(PartialCardSchema),
  discardPile: z.array(CardSchema),
  lifepoints: z.number().int().min(0),
  deckSeed: z.number().int(),

  // Filtering fields
  handCount: z.number().int().optional(),
  drawpileCount: z.number().int().optional(),
});

export const CombatBonusTypeSchema = z.enum([
  'aceInvulnerable',
  'aceVsAce',
  'diamondDoubleDefense',
  'diamondDeathShield',
  'clubDoubleOverflow',
  'spadeDoubleLp',
  'heartDeathShield',
]);

export const CombatLogStepSchema = z.object({
  target: z.enum(['frontCard', 'backCard', 'playerLp']),
  card: CardSchema.optional(),
  incomingDamage: z.number().int().min(0).optional(),
  damage: z.number().int().min(0),
  effectiveHp: z.number().int().min(0).optional(),
  hpBefore: z.number().int().min(0).optional(),
  hpAfter: z.number().int().min(0).optional(),
  lpBefore: z.number().int().min(0).optional(),
  lpAfter: z.number().int().min(0).optional(),
  absorbed: z.number().int().min(0).optional(),
  overflow: z.number().int().min(0).optional(),
  destroyed: z.boolean().optional(),
  bonuses: z.array(CombatBonusTypeSchema).optional(),
});

export const CombatLogEntrySchema = z.object({
  turnNumber: z.number().int().min(0),
  attackerPlayerIndex: z.number().int().min(0).max(1),
  attackerCard: CardSchema,
  targetColumn: z.number().int().min(0).max(3),
  baseDamage: z.number().int().min(0),
  totalLpDamage: z.number().int().min(0),
  steps: z.array(CombatLogStepSchema),
});

export const TransactionDetailSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('deploy'),
    gridIndex: z.number().int(),
    phaseAfter: GamePhaseSchema,
  }),
  z.object({
    type: z.literal('attack'),
    combat: CombatLogEntrySchema,
    reinforcementTriggered: z.boolean(),
    victoryTriggered: z.boolean(),
  }),
  z.object({ type: z.literal('pass') }),
  z.object({
    type: z.literal('reinforce'),
    column: z.number().int(),
    gridIndex: z.number().int(),
    cardsDrawn: z.number().int(),
    reinforcementComplete: z.boolean(),
  }),
  z.object({ type: z.literal('forfeit'), winnerIndex: z.number().int() }),
]);

export const TransactionLogEntrySchema = z.object({
  sequenceNumber: z.number().int().min(0),
  action: ActionSchema,
  stateHashBefore: z.string(),
  stateHashAfter: z.string(),
  timestamp: z.string().datetime(),
  details: TransactionDetailSchema,
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
  phase: GamePhaseSchema,
  turnNumber: z.number().int().min(0),

  // Optional Context
  gameOptions: GameOptionsSchema.optional(),
  reinforcement: z
    .object({
      column: z.number().int().min(0).max(3),
      attackerIndex: z.number().int().min(0).max(1),
    })
    .optional(),

  // Replay Integrity
  preStateHash: z.string().optional(),
  lastTurnHash: z.string().optional(),
  transactionLog: z.array(TransactionLogEntrySchema).optional(),

  outcome: z
    .object({
      winnerIndex: z.number().int(),
      victoryType: VictoryTypeSchema,
      turnNumber: z.number().int(),
    })
    .nullish(),
});

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
  z.object({
    type: z.literal('matchJoined'),
    matchId: z.string(),
    playerId: z.string(),
    playerIndex: z.number(),
  }),
  z.object({ type: z.literal('spectatorJoined'), matchId: z.string(), spectatorId: z.string() }),
  z.object({ type: z.literal('opponentDisconnected'), matchId: z.string() }),
  z.object({ type: z.literal('opponentReconnected'), matchId: z.string() }),
]);

export const ClientMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('createMatch'),
    playerName: z.string(),
    gameOptions: GameOptionsSchema.optional(),
    rngSeed: z.number().optional(),
  }),
  z.object({ type: z.literal('joinMatch'), matchId: z.string(), playerName: z.string() }),
  z.object({ type: z.literal('watchMatch'), matchId: z.string() }),
  z.object({ type: z.literal('action'), matchId: z.string(), action: ActionSchema }),
]);
