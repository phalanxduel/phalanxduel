/**
 * Copyright © 2026 Mike Hall
 * Licensed under the GNU General Public License v3.0.
 *
 * Phalanx System — Authoritative Schema v1.0
 * Defines the core deterministic types and the Phalanx: Duel format extension.
 */

import { z } from 'zod';

export const SCHEMA_VERSION = '0.4.1-rev.1';

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
 * id format: [Timestamp]::[MatchID]::[PlayerID]::[TurnNumber]::[DrawIndex]
 * Opaque — no card info encoded (prevents leakage on face-down cards).
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

export const BattlefieldSchema = z.array(z.union([BattlefieldCardSchema, z.null()]));

// --- 2. Turn Lifecycle & Event Spans ---

/** 7-Phase Turn Lifecycle mandated by v1.0 RULES.md (plus pre-game Deployment) */
export const TurnPhaseSchema = z.enum([
  'StartTurn',
  'DeploymentPhase',
  'AttackPhase',
  'AttackResolution',
  'CleanupPhase',
  'ReinforcementPhase',
  'DrawPhase',
  'EndTurn',
]);

export const GamePhaseSchema = z.union([TurnPhaseSchema, z.literal('gameOver')]);

export const TransitionTriggerSchema = z.enum([
  'deploy',
  'deploy:complete',
  'attack',
  'attack:reinforcement',
  'attack:victory',
  'pass',
  'reinforce',
  'reinforce:complete',
  'forfeit',
  'system:advance',
  'system:victory',
  'system:init',
]);

export const StateTransitionSchema = z.object({
  from: GamePhaseSchema,
  to: GamePhaseSchema,
  trigger: TransitionTriggerSchema,
  action: z.string().optional(), // Using string for simplicity in schema, matches ActionSchema type
  description: z.string(),
});

export const CardManifestSchema = z.array(PartialCardSchema);

export const PhaseRulesSchema = z.array(StateTransitionSchema);

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
  timestamp: z.iso.datetime(), // Frozen timestamp for the turn
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

export const DamageModeSchema = z.enum(['classic', 'cumulative']);

export const GameOptionsSchema = z.object({
  damageMode: DamageModeSchema.default('classic'),
  startingLifepoints: z.number().int().default(20),
  classicDeployment: z.boolean().default(true),
  quickStart: z.boolean().optional(),
});

const MatchParametersCoreShape = {
  rows: z.number().int().min(1).max(12),
  columns: z.number().int().min(1).max(12),
  maxHandSize: z.number().int().min(0),
  initialDraw: z.number().int().min(1),
};

export const CreateMatchParamsPartialSchema = z.object(MatchParametersCoreShape).partial();

/**
 * Authority Schema (Section 3)
 * Implements Strict and Hybrid parity rules.
 */
export const MatchParametersSchema = z
  .object({
    specVersion: z.literal('1.0'),
    classic: MatchConfigClassicSchema,

    // Top-level overrides/parameters
    ...MatchParametersCoreShape,

    modeClassicAces: z.boolean(),
    modeClassicFaceCards: z.boolean(),
    modeDamagePersistence: z.enum(['classic', 'cumulative']),
    modeClassicDeployment: z.boolean(),
    modeQuickStart: z.boolean(),

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
        code: 'custom',
        message: 'Global Constraint: Total slots cannot exceed 48.',
        path: ['rows', 'columns'],
      });
    }

    if (data.maxHandSize > data.columns) {
      ctx.addIssue({
        code: 'custom',
        message: 'Global Constraint: maxHandSize cannot exceed columns.',
        path: ['maxHandSize'],
      });
    }

    const expectedInitialDraw = totalSlots + data.columns;
    if (data.initialDraw !== expectedInitialDraw) {
      ctx.addIssue({
        code: 'custom',
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
            code: 'custom',
            message: `STRICT_MODE_VIOLATION: ${path} must match classic block.`,
            path: [path],
          });
        }
      }
    }
  });

/** Default match parameters for the standard 2x4 grid configuration. */
export const DEFAULT_MATCH_PARAMS: z.infer<typeof MatchParametersSchema> = {
  specVersion: '1.0',
  classic: {
    enabled: true,
    mode: 'strict',
    battlefield: { rows: 2, columns: 4 },
    hand: { maxHandSize: 4 },
    start: { initialDraw: 12 },
    modes: {
      classicAces: true,
      classicFaceCards: true,
      damagePersistence: 'classic',
    },
    initiative: { deployFirst: 'P2', attackFirst: 'P1' },
    passRules: { maxConsecutivePasses: 3, maxTotalPassesPerPlayer: 5 },
  },
  rows: 2,
  columns: 4,
  maxHandSize: 4,
  initialDraw: 12,
  modeClassicAces: true,
  modeClassicFaceCards: true,
  modeDamagePersistence: 'classic',
  modeClassicDeployment: true,
  modeQuickStart: false,
  modeSpecialStart: { enabled: false },
  initiative: { deployFirst: 'P2', attackFirst: 'P1' },
  modePassRules: { maxConsecutivePasses: 3, maxTotalPassesPerPlayer: 5 },
};

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
    timestamp: z.iso.datetime(),
  }),
  z.object({
    type: z.literal('attack'),
    playerIndex: z.number(),
    attackingColumn: z.number(),
    defendingColumn: z.number(),
    timestamp: z.iso.datetime(),
  }),
  z.object({ type: z.literal('pass'), playerIndex: z.number(), timestamp: z.iso.datetime() }),
  z.object({
    type: z.literal('reinforce'),
    playerIndex: z.number(),
    cardId: z.string(),
    timestamp: z.iso.datetime(),
  }),
  z.object({
    type: z.literal('forfeit'),
    playerIndex: z.number(),
    timestamp: z.iso.datetime(),
  }),
  z.object({
    type: z.literal('system:init'),
    timestamp: z.iso.datetime(),
  }),
]);

// --- 4. Game State & Duel Format ---

export const PlayerSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1).max(50),
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
  discardPileCount: z.number().int().optional(),
});

export const CombatBonusTypeSchema = z.enum([
  'aceInvulnerable',
  'aceVsAce',
  'diamondDoubleDefense',
  'diamondDeathShield',
  'clubDoubleOverflow',
  'spadeDoubleLp',
  'heartDeathShield',
  'faceCardIneligible',
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
  targetColumn: z.number().int().min(0).max(11),
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

export const PhaseHopTraceSchema = z.object({
  from: GamePhaseSchema,
  trigger: z.string().min(1),
  to: GamePhaseSchema,
});

export const TransactionLogEntrySchema = z.object({
  sequenceNumber: z.number().int().min(0),
  action: ActionSchema,
  stateHashBefore: z.string(),
  stateHashAfter: z.string(),
  timestamp: z.iso.datetime(),
  details: TransactionDetailSchema,
  phaseTrace: z.array(PhaseHopTraceSchema).optional(),
  phaseTraceDigest: z.string().optional(),
  turnHash: z.string().optional(),
});

/**
 * Phalanx: Duel Match State
 */
export const GameStateSchema = z.object({
  matchId: z.uuid(),
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
      column: z.number().int().min(0).max(11),
      attackerIndex: z.number().int().min(0).max(1),
    })
    .optional(),

  // Pass limit tracking (modePassRules enforcement)
  passState: z
    .object({
      consecutivePasses: z.tuple([z.number().int().min(0), z.number().int().min(0)]),
      totalPasses: z.tuple([z.number().int().min(0), z.number().int().min(0)]),
    })
    .optional(),

  // Replay integrity metadata is stored per transaction entry.
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
  matchId: z.uuid(),
  playerId: z.uuid(),
  preState: GameStateSchema,
  postState: GameStateSchema,
  action: ActionSchema,
  events: z.array(PhalanxEventSchema).optional(),
  turnHash: z.string().optional(),
  telemetry: z
    .object({
      events: z.array(z.string()).optional(),
      metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
    })
    .optional(),
});

/**
 * Redacted View Model for a specific player or spectator.
 */
export const GameViewModelSchema = z.object({
  state: GameStateSchema,
  viewerIndex: z.number().int().min(0).max(1).nullable(),
  validActions: z.array(ActionSchema),
});

/**
 * Redacted Turn Result for a specific player or spectator.
 */
export const TurnViewModelSchema = z.object({
  matchId: z.uuid(),
  viewerIndex: z.number().int().min(0).max(1).nullable(),
  preState: GameStateSchema,
  postState: GameStateSchema,
  action: ActionSchema,
  events: z.array(PhalanxEventSchema).optional(),
  validActions: z.array(ActionSchema),
});

// --- 6. Match Event Log ---

/**
 * Unified match event log: lifecycle events prepended to all turn-derived events.
 * The fingerprint is SHA-256 of the sorted-key JSON of the events array,
 * allowing offline verification without re-deriving.
 */
export const MatchEventLogSchema = z.object({
  matchId: z.uuid(),
  events: z.array(PhalanxEventSchema),
  fingerprint: z.string(),
  generatedAt: z.iso.datetime(),
});

// --- WebSocket Protocol Envelopes ---

export const ErrorResponseSchema = z.object({
  error: z.string(),
  code: z.string(),
  details: z.unknown().optional(),
});

export const MatchCreatedMessageSchema = z.object({
  type: z.literal('matchCreated'),
  matchId: z.uuid(),
  playerId: z.uuid(),
  playerIndex: z.number().int().min(0).max(1),
});

export const GameViewModelMessageSchema = z.object({
  type: z.literal('gameViewModel'),
  matchId: z.uuid(),
  viewModel: GameViewModelSchema,
  spectatorCount: z.number().int().min(0).optional(),
});

export const GameStateMessageSchema = z.object({
  type: z.literal('gameState'),
  matchId: z.uuid(),
  result: PhalanxTurnResultSchema,
  viewModel: TurnViewModelSchema.optional(),
  spectatorCount: z.number().int().min(0).optional(),
});

export const ServerMessageSchema = z.discriminatedUnion('type', [
  MatchCreatedMessageSchema,
  GameStateMessageSchema,
  GameViewModelMessageSchema,
  z.object({ type: z.literal('actionError'), error: z.string(), code: z.string() }),
  z.object({ type: z.literal('matchError'), error: z.string(), code: z.string() }),
  z.object({
    type: z.literal('matchJoined'),
    matchId: z.uuid(),
    playerId: z.uuid(),
    playerIndex: z.number(),
  }),
  z.object({
    type: z.literal('spectatorJoined'),
    matchId: z.uuid(),
    spectatorId: z.uuid(),
  }),
  z.object({ type: z.literal('opponentDisconnected'), matchId: z.uuid() }),
  z.object({ type: z.literal('opponentReconnected'), matchId: z.uuid() }),
  z.object({
    type: z.literal('authenticated'),
    user: z.object({
      id: z.uuid(),
      name: z.string(),
      gamertag: z.string().optional(),
      suffix: z.number().nullable().optional(),
      elo: z.number(),
    }),
  }),
  z.object({ type: z.literal('auth_error'), error: z.string() }),
]);

export const ClientMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('createMatch'),
    playerName: z.string().trim().min(1).max(50),
    gameOptions: GameOptionsSchema.optional(),
    rngSeed: z.number().optional(),
    opponent: z.enum(['human', 'bot-random', 'bot-heuristic']).optional(),
    matchParams: CreateMatchParamsPartialSchema.optional(),
  }),
  z.object({
    type: z.literal('joinMatch'),
    matchId: z.uuid(),
    playerName: z.string().trim().min(1).max(50),
  }),
  z.object({
    type: z.literal('rejoinMatch'),
    matchId: z.uuid(),
    playerId: z.uuid(),
  }),
  z.object({ type: z.literal('watchMatch'), matchId: z.uuid() }),
  z.object({ type: z.literal('action'), matchId: z.uuid(), action: ActionSchema }),
  z.object({ type: z.literal('authenticate'), token: z.string() }),
]);
