/**
 * Copyright © 2026 Mike Hall
 * Licensed under the GNU Affero General Public License v3.0.
 *
 * Phalanx System — Authoritative Schema v1.0
 * Defines the core deterministic types and the Phalanx: Duel format extension.
 */

import { z } from 'zod';

export const SCHEMA_VERSION = '1.0.0-rev.1';

// --- 1. Core Phalanx System Types ---

export const SuitSchema = z
  .enum(['spades', 'hearts', 'diamonds', 'clubs'])
  .describe(
    'Card suit. Determines boundary effects during attack resolution: ♦ Diamond (double defense at Card→Card boundary), ♥ Heart (death shield at Card→Player boundary), ♣ Club (double overflow after first destruction), ♠ Spade (double LP damage at Card→Player boundary). See RULES.md §9.',
  );

export const CardTypeSchema = z
  .enum(['number', 'ace', 'jack', 'queen', 'king', 'joker'])
  .describe(
    'Card type classification. Governs destruction eligibility under Classic Aces (§10) and Classic Face Cards (§11) rules. Aces are only destroyed by other aces at rank 0. Face cards follow a hierarchy: J→J, Q→J/Q, K→J/Q/K.',
  );

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
 * Opaque — no card info encoded.
 */
export const CardSchema = z.object({
  id: z
    .string()
    .min(1)
    .describe(
      'Opaque deterministic card ID. Format: [Timestamp]::[MatchID]::[PlayerID]::[TurnNumber]::[DrawIndex]. Generated at draw-time. No card info is encoded into the suffix.',
    ),
  suit: SuitSchema,
  face: z
    .string()
    .regex(/^[A2-9TJQK]$/)
    .describe(
      'Card face symbol. One of: A (Ace), 2-9, T (Ten), J (Jack), Q (Queen), K (King). Maps to value via RANK_VALUES lookup.',
    ),
  value: z
    .number()
    .int()
    .min(0)
    .max(11)
    .describe(
      'Numeric combat value. A=1, 2-9=face value, T=10, J/Q/K=11. Used as base damage in attack resolution.',
    ),
  type: CardTypeSchema,
});

/**
 * ID-less card representation for the drawpile.
 * IDs are generated at draw-time to ensure determinism.
 */
export const PartialCardSchema = CardSchema.omit({ id: true });

export const GridPositionSchema = z.object({
  row: z
    .number()
    .int()
    .min(0)
    .max(11)
    .describe(
      'Rank index within a column (0 = front, facing opponent). Max 11 per Global System Constraints §3.3.',
    ),
  col: z
    .number()
    .int()
    .min(0)
    .max(11)
    .describe('Column index on the battlefield. Max 11 per Global System Constraints §3.3.'),
});

export const BattlefieldCardSchema = z.object({
  card: CardSchema,
  position: GridPositionSchema,
  currentHp: z
    .number()
    .int()
    .min(0)
    .max(11)
    .describe(
      'Current hit points. Equals card value at deployment. Reduced by incoming damage during attack resolution. Card is destroyed when reduced to 0 (subject to destruction eligibility rules §10-11).',
    ),
  faceDown: z
    .boolean()
    .describe(
      'Whether the card is face-down. Canonical v1.0 gameplay keeps battlefield cards face-up (`false`). This field remains for forward-compatibility and non-v1 visibility experiments; see §21.2.',
    ),
});

export const BattlefieldSchema = z.array(z.union([BattlefieldCardSchema, z.null()]));

// --- 2. Turn Lifecycle & Event Spans ---

/** 8-phase turn lifecycle mandated by v1.0 RULES.md §4. */
export const TurnPhaseSchema = z
  .enum([
    'StartTurn',
    'DeploymentPhase',
    'AttackPhase',
    'AttackResolution',
    'CleanupPhase',
    'ReinforcementPhase',
    'DrawPhase',
    'EndTurn',
  ])
  .describe(
    'Deterministic turn lifecycle phase (RULES.md §4). Each turn executes all 8 phases in order: StartTurn → DeploymentPhase → AttackPhase → AttackResolution → CleanupPhase → ReinforcementPhase → DrawPhase → EndTurn. Player actions are only valid in specific phases.',
  );

export const GamePhaseSchema = z
  .union([TurnPhaseSchema, z.literal('gameOver')])
  .describe(
    'Current game phase. One of the 8 turn lifecycle phases or gameOver. The gameOver phase is terminal and set when a victory condition is met (LP depletion, card depletion, forfeit, or pass limit).',
  );

export const TransitionTriggerSchema = z
  .enum([
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
  ])
  .describe(
    'State machine trigger that causes a phase transition. Player triggers: deploy, attack, pass, reinforce, forfeit. System triggers: deploy:complete, attack:reinforcement, attack:victory, reinforce:complete, system:advance, system:victory, system:init.',
  );

export const StateTransitionSchema = z.object({
  from: GamePhaseSchema,
  to: GamePhaseSchema,
  trigger: TransitionTriggerSchema,
  action: z.string().optional(), // Using string for simplicity in schema, matches ActionSchema type
  description: z.string(),
});

export const CardManifestSchema = z.array(PartialCardSchema);

export const PhaseRulesSchema = z.array(StateTransitionSchema);

export const VictoryTypeSchema = z
  .enum(['lpDepletion', 'cardDepletion', 'forfeit', 'passLimit'])
  .describe(
    'Victory condition type. lpDepletion: opponent LP reaches 0. cardDepletion: opponent has no cards on battlefield or in hand. forfeit: player explicitly forfeits. passLimit: player exceeds maxConsecutivePasses or maxTotalPassesPerPlayer (§16).',
  );

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

export const ClassicModeTypeSchema = z
  .enum(['strict', 'hybrid'])
  .describe(
    'Classic schema binding mode (§3.1). strict: all top-level parameters must exactly match the classic template. hybrid: classic values serve as defaults, top-level may override within Global System Constraints.',
  );

export const MatchConfigClassicSchema = z.object({
  enabled: z.boolean().describe('Whether Classic schema binding is active (§3.1).'),
  mode: ClassicModeTypeSchema.default('strict'),
  battlefield: z.object({
    rows: z
      .number()
      .int()
      .min(1)
      .max(12)
      .default(2)
      .describe('Number of ranks (rows) per column. Default: 2. Max: 12 (§3.3).'),
    columns: z
      .number()
      .int()
      .min(1)
      .max(12)
      .default(4)
      .describe('Number of columns per player board. Default: 4. Max: 12 (§3.3).'),
  }),
  hand: z.object({
    maxHandSize: z
      .number()
      .int()
      .min(0)
      .max(12)
      .default(4)
      .describe('Maximum hand size. Must be ≤ columns (§3.3). Default: 4.'),
  }),
  start: z.object({
    initialDraw: z
      .number()
      .int()
      .min(1)
      .max(60)
      .default(12)
      .describe(
        'Cards drawn at match start. Formula: rows × columns + columns (§3.3). Default: 12.',
      ),
  }),
  modes: z.object({
    classicAces: z
      .boolean()
      .default(true)
      .describe('Enable Classic Ace rules: Aces only destroyed by other Aces at rank 0 (§10).'),
    classicFaceCards: z
      .boolean()
      .default(true)
      .describe('Enable Classic Face Card rules: J→J, Q→J/Q, K→J/Q/K destruction hierarchy (§11).'),
    damagePersistence: z
      .enum(['classic', 'cumulative'])
      .default('classic')
      .describe(
        'Damage mode. classic: no HP persists between turns. cumulative: damage persists (§12).',
      ),
    quickStart: z
      .boolean()
      .default(false)
      .describe('Reserved compatibility flag. Must be false for v1.0-compliant matches (§3.4).'),
  }),
  initiative: z.object({
    deployFirst: z
      .enum(['P1', 'P2'])
      .default('P2')
      .describe('Which player deploys first in DeploymentPhase.'),
    attackFirst: z
      .enum(['P1', 'P2'])
      .default('P1')
      .describe('Which player attacks first in AttackPhase.'),
  }),
  passRules: z.object({
    maxConsecutivePasses: z
      .number()
      .int()
      .min(1)
      .max(100)
      .default(3)
      .describe('Maximum consecutive passes before automatic forfeit (§16). Default: 3.'),
    maxTotalPassesPerPlayer: z
      .number()
      .int()
      .min(1)
      .max(100)
      .default(5)
      .describe('Maximum total passes per player before automatic forfeit (§16). Default: 5.'),
  }),
});

export const DamageModeSchema = z
  .enum(['classic', 'cumulative'])
  .describe(
    'Damage persistence mode (§12). classic: card HP resets each turn. cumulative: damage persists across turns.',
  );

export const GameOptionsSchema = z.object({
  damageMode: DamageModeSchema.default('classic').describe(
    'Compatibility-only runtime override. Canonical v1.0 rule authority belongs to match params `modeDamagePersistence`, not `gameOptions.damageMode`.',
  ),
  startingLifepoints: z
    .number()
    .int()
    .min(1)
    .max(500)
    .default(20)
    .describe(
      'Compatibility-only runtime override for bootstrap surfaces. Canonical v1.0 gameplay is defined by the match params contract, not `gameOptions.startingLifepoints`.',
    ),
  classicDeployment: z
    .boolean()
    .default(true)
    .describe(
      'Compatibility-only runtime override for deployment bootstrap. Canonical v1.0 rule authority belongs to `modeClassicDeployment` in the match params.',
    ),
  quickStart: z
    .boolean()
    .optional()
    .describe(
      'Compatibility-only bootstrap shortcut. If true, runtime may skip deployment and pre-fill the battlefield, but canonical v1.0-compliant matches keep this disabled.',
    ),
});

const ClassicConfigPartialSchema = z.object({
  enabled: z.boolean().optional(),
  mode: ClassicModeTypeSchema.optional(),
  battlefield: z
    .object({
      rows: z.number().int().min(1).max(12).optional(),
      columns: z.number().int().min(1).max(12).optional(),
    })
    .partial()
    .optional(),
  hand: z
    .object({
      maxHandSize: z.number().int().min(0).max(12).optional(),
    })
    .partial()
    .optional(),
  start: z
    .object({
      initialDraw: z.number().int().min(1).max(60).optional(),
    })
    .partial()
    .optional(),
  modes: z
    .object({
      classicAces: z.boolean().optional(),
      classicFaceCards: z.boolean().optional(),
      damagePersistence: z.enum(['classic', 'cumulative']).optional(),
      quickStart: z.boolean().optional(),
    })
    .partial()
    .optional(),
  initiative: z
    .object({
      deployFirst: z.enum(['P1', 'P2']).optional(),
      attackFirst: z.enum(['P1', 'P2']).optional(),
    })
    .partial()
    .optional(),
  passRules: z
    .object({
      maxConsecutivePasses: z.number().int().min(1).max(100).optional(),
      maxTotalPassesPerPlayer: z.number().int().min(1).max(100).optional(),
    })
    .partial()
    .optional(),
});

const MatchParametersCoreShape = {
  rows: z
    .number()
    .int()
    .min(1)
    .max(12)
    .describe('Number of ranks per column (§3.3). Min: 1, Max: 12. rows × columns ≤ 48.'),
  columns: z
    .number()
    .int()
    .min(1)
    .max(12)
    .describe('Number of columns per player board (§3.3). Min: 1, Max: 12. rows × columns ≤ 48.'),
  maxHandSize: z
    .number()
    .int()
    .min(0)
    .max(12)
    .describe('Maximum hand size. Must be ≤ columns (§3.3).'),
  initialDraw: z
    .number()
    .int()
    .min(1)
    .max(60)
    .describe('Cards drawn at match start. Must equal rows × columns + columns (§3.3).'),
};

export const CreateMatchParamsPartialSchema = z
  .object({
    ...MatchParametersCoreShape,
    classic: ClassicConfigPartialSchema.optional(),
    modeClassicAces: z.boolean().optional(),
    modeClassicFaceCards: z.boolean().optional(),
    modeDamagePersistence: z.enum(['classic', 'cumulative']).optional(),
    modeClassicDeployment: z.boolean().optional(),
    modeQuickStart: z.boolean().optional(),
    modeSpecialStart: z
      .object({
        enabled: z.boolean().optional(),
        noAttackCountsAsPassUntil: z.string().optional(),
      })
      .partial()
      .optional(),
    initiative: z
      .object({
        deployFirst: z.enum(['P1', 'P2']).optional(),
        attackFirst: z.enum(['P1', 'P2']).optional(),
      })
      .partial()
      .optional(),
    modePassRules: z
      .object({
        maxConsecutivePasses: z.number().int().min(1).max(100).optional(),
        maxTotalPassesPerPlayer: z.number().int().min(1).max(100).optional(),
      })
      .partial()
      .optional(),
  })
  .partial();

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

    modeClassicAces: z.boolean().describe('Enable Classic Ace invulnerability rules (§10).'),
    modeClassicFaceCards: z
      .boolean()
      .describe('Enable Classic Face Card destruction hierarchy (§11).'),
    modeDamagePersistence: z
      .enum(['classic', 'cumulative'])
      .describe('Damage persistence mode (§12).'),
    modeClassicDeployment: z
      .boolean()
      .describe('Enable Classic Deployment: alternating card placement (§5).'),
    modeQuickStart: z
      .boolean()
      .describe(
        'Reserved compatibility flag for non-standard quick-start bootstrap. Canonical v1.0-compliant matches keep this false.',
      ),

    modeSpecialStart: z.object({
      enabled: z
        .boolean()
        .describe(
          'Enable Special Start Mode: no-attack does not count as pass until first forced reinforcement (§7).',
        ),
      noAttackCountsAsPassUntil: z
        .string()
        .optional()
        .describe(
          'Condition for closing the Special Start window. Default: bothPlayersCompletedFirstForcedReinforcement.',
        ),
    }),

    initiative: z.object({
      deployFirst: z.enum(['P1', 'P2']).describe('Which player deploys first in DeploymentPhase.'),
      attackFirst: z.enum(['P1', 'P2']).describe('Which player attacks first in AttackPhase.'),
    }),

    modePassRules: z.object({
      maxConsecutivePasses: z
        .number()
        .int()
        .min(1)
        .max(100)
        .describe('Maximum consecutive passes before automatic forfeit (§16).'),
      maxTotalPassesPerPlayer: z
        .number()
        .int()
        .min(1)
        .max(100)
        .describe('Maximum total passes per player before automatic forfeit (§16).'),
    }),
  })
  .superRefine((data, ctx) => {
    const deckReserve = 4;
    const maxStartingDraw = 52 - deckReserve;

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

    if (data.initialDraw > maxStartingDraw) {
      ctx.addIssue({
        code: 'custom',
        message: `Card Scarcity Invariant violated: initialDraw cannot exceed ${maxStartingDraw}.`,
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
        ['modeQuickStart', data.modeQuickStart, data.classic.modes.quickStart],
        [
          'initiative.deployFirst',
          data.initiative.deployFirst,
          data.classic.initiative.deployFirst,
        ],
        [
          'initiative.attackFirst',
          data.initiative.attackFirst,
          data.classic.initiative.attackFirst,
        ],
        [
          'modePassRules.maxConsecutivePasses',
          data.modePassRules.maxConsecutivePasses,
          data.classic.passRules.maxConsecutivePasses,
        ],
        [
          'modePassRules.maxTotalPassesPerPlayer',
          data.modePassRules.maxTotalPassesPerPlayer,
          data.classic.passRules.maxTotalPassesPerPlayer,
        ],
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
      damagePersistence: 'cumulative',
      quickStart: false,
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
  modeDamagePersistence: 'cumulative',
  modeClassicDeployment: true,
  modeQuickStart: false,
  modeSpecialStart: { enabled: false },
  initiative: { deployFirst: 'P2', attackFirst: 'P1' },
  modePassRules: { maxConsecutivePasses: 3, maxTotalPassesPerPlayer: 5 },
};

// eslint-disable-next-line complexity
export function normalizeCreateMatchParams(
  matchParams?: z.input<typeof CreateMatchParamsPartialSchema>,
) {
  const classicEnabled = matchParams?.classic?.enabled ?? DEFAULT_MATCH_PARAMS.classic.enabled;
  const classicMode = matchParams?.classic?.mode ?? DEFAULT_MATCH_PARAMS.classic.mode;
  const rows =
    matchParams?.rows ??
    (classicEnabled ? matchParams?.classic?.battlefield?.rows : undefined) ??
    DEFAULT_MATCH_PARAMS.rows;
  const columns =
    matchParams?.columns ??
    (classicEnabled ? matchParams?.classic?.battlefield?.columns : undefined) ??
    DEFAULT_MATCH_PARAMS.columns;
  const maxHandSize =
    matchParams?.maxHandSize ??
    (classicEnabled ? matchParams?.classic?.hand?.maxHandSize : undefined) ??
    Math.min(DEFAULT_MATCH_PARAMS.maxHandSize, columns);
  const initialDraw =
    matchParams?.initialDraw ??
    (classicEnabled ? matchParams?.classic?.start?.initialDraw : undefined) ??
    rows * columns + columns;
  const modeClassicAces =
    matchParams?.modeClassicAces ??
    (classicEnabled ? matchParams?.classic?.modes?.classicAces : undefined) ??
    DEFAULT_MATCH_PARAMS.modeClassicAces;
  const modeClassicFaceCards =
    matchParams?.modeClassicFaceCards ??
    (classicEnabled ? matchParams?.classic?.modes?.classicFaceCards : undefined) ??
    DEFAULT_MATCH_PARAMS.modeClassicFaceCards;
  const modeDamagePersistence =
    matchParams?.modeDamagePersistence ??
    (classicEnabled ? matchParams?.classic?.modes?.damagePersistence : undefined) ??
    DEFAULT_MATCH_PARAMS.modeDamagePersistence;
  const deployFirst =
    matchParams?.initiative?.deployFirst ??
    (classicEnabled ? matchParams?.classic?.initiative?.deployFirst : undefined) ??
    DEFAULT_MATCH_PARAMS.initiative.deployFirst;
  const attackFirst =
    matchParams?.initiative?.attackFirst ??
    (classicEnabled ? matchParams?.classic?.initiative?.attackFirst : undefined) ??
    DEFAULT_MATCH_PARAMS.initiative.attackFirst;
  const maxConsecutivePasses =
    matchParams?.modePassRules?.maxConsecutivePasses ??
    (classicEnabled ? matchParams?.classic?.passRules?.maxConsecutivePasses : undefined) ??
    DEFAULT_MATCH_PARAMS.modePassRules.maxConsecutivePasses;
  const maxTotalPassesPerPlayer =
    matchParams?.modePassRules?.maxTotalPassesPerPlayer ??
    (classicEnabled ? matchParams?.classic?.passRules?.maxTotalPassesPerPlayer : undefined) ??
    DEFAULT_MATCH_PARAMS.modePassRules.maxTotalPassesPerPlayer;
  const classicRows =
    matchParams?.classic?.battlefield?.rows ??
    (classicEnabled ? rows : DEFAULT_MATCH_PARAMS.classic.battlefield.rows);
  const classicColumns =
    matchParams?.classic?.battlefield?.columns ??
    (classicEnabled ? columns : DEFAULT_MATCH_PARAMS.classic.battlefield.columns);
  const classicMaxHandSize =
    matchParams?.classic?.hand?.maxHandSize ??
    (classicEnabled
      ? maxHandSize
      : Math.min(DEFAULT_MATCH_PARAMS.classic.hand.maxHandSize, classicColumns));
  const classicInitialDraw =
    matchParams?.classic?.start?.initialDraw ??
    (classicEnabled ? initialDraw : classicRows * classicColumns + classicColumns);
  const classicAces =
    matchParams?.classic?.modes?.classicAces ??
    (classicEnabled ? modeClassicAces : DEFAULT_MATCH_PARAMS.classic.modes.classicAces);
  const classicFaceCards =
    matchParams?.classic?.modes?.classicFaceCards ??
    (classicEnabled ? modeClassicFaceCards : DEFAULT_MATCH_PARAMS.classic.modes.classicFaceCards);
  const classicDamagePersistence =
    matchParams?.classic?.modes?.damagePersistence ??
    (classicEnabled ? modeDamagePersistence : DEFAULT_MATCH_PARAMS.classic.modes.damagePersistence);
  const classicDeployFirst =
    matchParams?.classic?.initiative?.deployFirst ??
    (classicEnabled ? deployFirst : DEFAULT_MATCH_PARAMS.classic.initiative.deployFirst);
  const classicAttackFirst =
    matchParams?.classic?.initiative?.attackFirst ??
    (classicEnabled ? attackFirst : DEFAULT_MATCH_PARAMS.classic.initiative.attackFirst);
  const classicMaxConsecutivePasses =
    matchParams?.classic?.passRules?.maxConsecutivePasses ??
    (classicEnabled
      ? maxConsecutivePasses
      : DEFAULT_MATCH_PARAMS.classic.passRules.maxConsecutivePasses);
  const classicMaxTotalPassesPerPlayer =
    matchParams?.classic?.passRules?.maxTotalPassesPerPlayer ??
    (classicEnabled
      ? maxTotalPassesPerPlayer
      : DEFAULT_MATCH_PARAMS.classic.passRules.maxTotalPassesPerPlayer);

  const merged = {
    ...DEFAULT_MATCH_PARAMS,
    classic: {
      battlefield: {
        rows: classicRows,
        columns: classicColumns,
      },
      hand: {
        maxHandSize: classicMaxHandSize,
      },
      start: {
        initialDraw: classicInitialDraw,
      },
      modes: {
        classicAces,
        classicFaceCards,
        damagePersistence: classicDamagePersistence,
        quickStart:
          matchParams?.classic?.modes?.quickStart ?? DEFAULT_MATCH_PARAMS.classic.modes.quickStart,
      },
      initiative: {
        deployFirst: classicDeployFirst,
        attackFirst: classicAttackFirst,
      },
      passRules: {
        maxConsecutivePasses: classicMaxConsecutivePasses,
        maxTotalPassesPerPlayer: classicMaxTotalPassesPerPlayer,
      },
      enabled: classicEnabled,
      mode: classicMode,
    },
    rows,
    columns,
    maxHandSize,
    initialDraw,
    modeClassicAces,
    modeClassicFaceCards,
    modeDamagePersistence,
    modeClassicDeployment:
      matchParams?.modeClassicDeployment ?? DEFAULT_MATCH_PARAMS.modeClassicDeployment,
    modeQuickStart: matchParams?.modeQuickStart ?? DEFAULT_MATCH_PARAMS.modeQuickStart,
    modeSpecialStart: {
      ...DEFAULT_MATCH_PARAMS.modeSpecialStart,
      ...matchParams?.modeSpecialStart,
    },
    initiative: {
      deployFirst,
      attackFirst,
    },
    modePassRules: {
      maxConsecutivePasses,
      maxTotalPassesPerPlayer,
    },
  };

  return MatchParametersSchema.safeParse(merged);
}

// --- 5. Game DSL & Atomic Payloads ---

/**
 * Phalanx DSL (Section 20.1)
 * Examples: "D:0:cardID", "A:0:3", "P", "R:cardID", "F"
 */
export const ActionDSLSchema = z
  .string()
  .regex(/^(D:\d+:[\w:]+|A:\d+:\d+|P|R:[\w:]+|F)$/)
  .describe(
    'Phalanx Action DSL (v1.0). Format: D:col:cardId (Deploy), A:atkCol:defCol (Attack), P (Pass), R:cardId (Reinforce), F (Forfeit).',
  );

const ActionTransportFieldsSchema = z.object({
  msgId: z.uuid().optional().describe('Reliable transport message identifier for ACK/replay.'),
  expectedSequenceNumber: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe('Client freshness guard for rejecting stale or out-of-order actions.'),
});

const SystemInitConfigSchema = z.object({
  matchId: z.uuid(),
  players: z.tuple([
    z.object({
      id: z.uuid(),
      name: z.string().trim().min(1).max(50),
    }),
    z.object({
      id: z.uuid(),
      name: z.string().trim().min(1).max(50),
    }),
  ]),
  rngSeed: z.number().int(),
  gameOptions: GameOptionsSchema.optional(),
  drawTimestamp: z.iso.datetime().optional(),
  matchParams: MatchParametersSchema.optional(),
});

/**
 * Standard Action Schema
 */
export const ActionSchema = z
  .discriminatedUnion('type', [
    z
      .object({
        type: z.literal('deploy'),
        playerIndex: z.number().int().min(0).max(1).describe('Index of the player (0 or 1).'),
        column: z.number().int().min(0).max(11).describe('Battlefield column index (0-11).'),
        cardId: z.string().describe('ID of the card to deploy from hand.'),
        timestamp: z.iso.datetime(),
        ...ActionTransportFieldsSchema.shape,
      })
      .describe(
        'Deploy a card from hand. Valid during DeploymentPhase. Each player must alternate deploying cards until the battlefield is full according to match parameters.',
      ),
    z
      .object({
        type: z.literal('attack'),
        playerIndex: z.number().int().min(0).max(1).describe('Index of the player (0 or 1).'),
        attackingColumn: z
          .number()
          .int()
          .min(0)
          .max(11)
          .describe(
            'Column index containing the attacking card. Must have a non-null card at rank 0.',
          ),
        defendingColumn: z
          .number()
          .int()
          .min(0)
          .max(11)
          .describe('Target column index on the opponent board.'),
        timestamp: z.iso.datetime(),
        ...ActionTransportFieldsSchema.shape,
      })
      .describe(
        'Declare an attack. Valid during AttackPhase. Requires a card at rank 0 of the attacking column.',
      ),
    z
      .object({
        type: z.literal('pass'),
        playerIndex: z.number().int().min(0).max(1).describe('Index of the player (0 or 1).'),
        timestamp: z.iso.datetime(),
        ...ActionTransportFieldsSchema.shape,
      })
      .describe(
        'Pass the current turn. Valid during AttackPhase. Excessive consecutive or total passes will result in a forfeit.',
      ),
    z
      .object({
        type: z.literal('reinforce'),
        playerIndex: z.number().int().min(0).max(1).describe('Index of the player (0 or 1).'),
        cardId: z.string().describe('ID of the card to deploy from hand.'),
        timestamp: z.iso.datetime(),
        ...ActionTransportFieldsSchema.shape,
      })
      .describe(
        'Reinforce a column after cleanup. Valid during ReinforcementPhase. Cards are deployed to the back-most empty rank of the column.',
      ),
    z
      .object({
        type: z.literal('forfeit'),
        playerIndex: z.number().int().min(0).max(1).describe('Index of the player (0 or 1).'),
        timestamp: z.iso.datetime(),
        ...ActionTransportFieldsSchema.shape,
      })
      .describe('Immediately forfeit the match. Valid in any phase.'),
    z
      .object({
        type: z.literal('system:init'),
        timestamp: z.iso.datetime(),
        config: SystemInitConfigSchema.optional(),
        ...ActionTransportFieldsSchema.shape,
      })
      .describe('Internal: Initialize match state.'),
  ])
  .describe('Authoritative action payload for Phalanx: Duel.');

// --- 4. Game State & Duel Format ---

export const PlayerSchema = z.object({
  id: z
    .uuid()
    .describe('Unique player identifier (UUID v4). Used for session binding and reconnection.'),
  name: z
    .string()
    .trim()
    .min(1)
    .max(50)
    .describe('Display name. 1-50 characters, whitespace-trimmed.'),
});

export const PlayerStateSchema = z.object({
  player: PlayerSchema,
  hand: z
    .array(CardSchema)
    .describe(
      'Cards in hand. Visible only to the owner; redacted for opponents and spectators (§21.1).',
    ),
  battlefield: z
    .array(z.union([BattlefieldCardSchema, z.null()]))
    .describe(
      'Battlefield grid slots. Array of rows × columns elements. null = empty slot. Visible to all (§21.2).',
    ),
  drawpile: z
    .array(PartialCardSchema)
    .describe('Remaining draw pile. Always hidden from all players and spectators (§21.1).'),
  discardPile: z
    .array(CardSchema)
    .describe('Destroyed cards. Owner sees full pile; others see only top card and count (§21.3).'),
  lifepoints: z
    .number()
    .int()
    .min(0)
    .max(500)
    .describe(
      'Current life points. Starts at startingLifepoints (default 20). Game ends at 0 (lpDepletion victory).',
    ),
  deckSeed: z
    .number()
    .int()
    .describe('Deterministic RNG seed for deck shuffling. Ensures replay reproducibility.'),

  // Filtering fields — counts visible to all players for fog-of-war
  handCount: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe('Public: number of cards in hand. Visible to all players and spectators.'),
  drawpileCount: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe('Public: number of cards remaining in draw pile.'),
  discardPileCount: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe('Public: number of cards in discard pile.'),
});

export const CombatBonusTypeSchema = z
  .enum([
    'aceInvulnerable',
    'aceVsAce',
    'diamondDoubleDefense',
    'diamondDeathShield',
    'clubDoubleOverflow',
    'spadeDoubleLp',
    'heartDeathShield',
    'faceCardIneligible',
  ])
  .describe(
    'Combat bonus applied during attack resolution. Maps to suit boundary effects (§9) and destruction eligibility rules (§10-11).',
  );

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
  remaining: z.number().int().min(0).optional(),
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
  causeLabels: z.array(z.string()).optional(),
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
  z.object({ type: z.literal('system:init') }),
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
  msgId: z.uuid().nullable().optional(),
  timestamp: z.iso.datetime(),
  details: TransactionDetailSchema,
  phaseTrace: z.array(PhaseHopTraceSchema).optional(),
  phaseTraceDigest: z.string().optional(),
  turnHash: z.string().optional(),
});

/**
 * Phalanx: Duel Match State
 */
export const GameStateSchema = z
  .object({
    matchId: z.uuid().describe('Unique match identifier (UUID v4).'),
    specVersion: z.literal('1.0').describe('Rules specification version. Must be "1.0".'),
    params: MatchParametersSchema,

    players: z
      .array(PlayerStateSchema)
      .length(2)
      .describe('Exactly 2 player states. Index 0 = P1 (inviting), Index 1 = P2 (invited).'),
    activePlayerIndex: z
      .number()
      .int()
      .min(0)
      .max(1)
      .describe('Index of the player whose turn it is (0 or 1).'),
    phase: GamePhaseSchema,
    turnNumber: z
      .number()
      .int()
      .min(0)
      .describe(
        'Current turn number. Starts at 0 (deployment) and increments each full turn cycle.',
      ),

    // Optional Context
    gameOptions: GameOptionsSchema.optional().describe(
      'Runtime compatibility inputs applied at match creation. These fields are transport-facing and do not supersede the canonical match params contract.',
    ),
    reinforcement: z
      .object({
        column: z
          .number()
          .int()
          .min(0)
          .max(11)
          .describe('Column index where reinforcement is occurring.'),
        attackerIndex: z
          .number()
          .int()
          .min(0)
          .max(1)
          .describe('Index of the player who triggered the reinforcement via attack.'),
      })
      .optional()
      .describe(
        'Present only during ReinforcementPhase. Indicates which column requires reinforcement after cleanup (§14).',
      ),

    // Pass limit tracking (modePassRules enforcement)
    passState: z
      .object({
        consecutivePasses: z
          .tuple([z.number().int().min(0), z.number().int().min(0)])
          .describe('Consecutive pass count per player [P1, P2]. Resets on non-pass action.'),
        totalPasses: z
          .tuple([z.number().int().min(0), z.number().int().min(0)])
          .describe('Lifetime total pass count per player [P1, P2].'),
      })
      .optional()
      .describe('Pass tracking state for modePassRules enforcement (§16).'),

    // Replay integrity metadata is stored per transaction entry.
    transactionLog: z
      .array(TransactionLogEntrySchema)
      .optional()
      .describe(
        'Ordered log of all actions applied to this match. Each entry contains state hashes for replay verification (§18).',
      ),

    outcome: z
      .object({
        winnerIndex: z
          .number()
          .int()
          .min(0)
          .max(1)
          .describe('Index of the winning player (0 or 1).'),
        victoryType: VictoryTypeSchema,
        turnNumber: z.number().int().min(0).describe('Turn number when victory was achieved.'),
      })
      .nullish()
      .describe('Match outcome. Present only when phase is gameOver.'),
  })
  .superRefine((state, ctx) => {
    if (state.phase === 'gameOver' && !state.outcome) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['outcome'],
        message: 'outcome is required when phase is gameOver',
      });
    }
    if (state.phase !== 'gameOver' && state.outcome != null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['outcome'],
        message: `outcome must be absent when phase is ${state.phase}`,
      });
    }
    if (state.phase === 'ReinforcementPhase' && !state.reinforcement) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['reinforcement'],
        message: 'reinforcement is required when phase is ReinforcementPhase',
      });
    }
    if (state.phase !== 'ReinforcementPhase' && state.reinforcement != null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['reinforcement'],
        message: `reinforcement must be absent when phase is ${state.phase}`,
      });
    }
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

const MessageIdSchema = z
  .uuid()
  .describe('Unique transport message identifier used for ACK/replay.');

const ServerTransportFieldsSchema = z.object({
  msgId: MessageIdSchema.optional(),
});

const ClientTransportFieldsSchema = z.object({
  msgId: MessageIdSchema.optional(),
});

const ReliableClientTransportFieldsSchema = z.object({
  msgId: MessageIdSchema,
});

const AckMessageSchema = z
  .object({
    type: z.literal('ack'),
    ackedMsgId: MessageIdSchema,
  })
  .extend(ServerTransportFieldsSchema.shape)
  .describe('Acknowledges successful receipt and handling of a client message.');

const PingMessageSchema = z
  .object({
    type: z.literal('ping'),
    timestamp: z.iso.datetime(),
  })
  .extend(ServerTransportFieldsSchema.shape)
  .describe('Application-level heartbeat ping.');

const PongMessageSchema = z
  .object({
    type: z.literal('pong'),
    timestamp: z.iso.datetime(),
    replyTo: MessageIdSchema.optional(),
  })
  .extend(ServerTransportFieldsSchema.shape)
  .describe('Application-level heartbeat pong.');

export const MatchCreatedMessageSchema = z
  .object({
    type: z.literal('matchCreated'),
    matchId: z.uuid().describe('UUID of the newly created match.'),
    playerId: z.uuid().describe('Secret player UUID. Required for rejoinMatch.'),
    playerIndex: z.number().int().min(0).max(1).describe('Assigned player index (0 = P1, 1 = P2).'),
    gameOptions: GameOptionsSchema.optional().describe('The accepted game configuration.'),
  })
  .extend(ServerTransportFieldsSchema.shape)
  .describe('Sent to the match creator upon successful match creation.');

export const GameViewModelMessageSchema = z
  .object({
    type: z.literal('gameViewModel'),
    matchId: z.uuid(),
    viewModel: GameViewModelSchema,
    spectatorCount: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe('Number of spectators currently watching the match.'),
  })
  .extend(ServerTransportFieldsSchema.shape)
  .describe(
    'Sent when both players have joined. Contains the fog-of-war filtered game state and valid actions for the viewer.',
  );

export const GameStateMessageSchema = z
  .object({
    type: z.literal('gameState'),
    matchId: z.uuid(),
    result: PhalanxTurnResultSchema,
    viewModel: TurnViewModelSchema.optional().describe(
      'Fog-of-war filtered view of the turn result for the receiving player.',
    ),
    spectatorCount: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe('Number of spectators currently watching the match.'),
  })
  .extend(ServerTransportFieldsSchema.shape)
  .describe(
    'Sent after each action is processed. Contains the full turn result and optional redacted view model.',
  );

export const ServerMessageSchema = z
  .discriminatedUnion('type', [
    AckMessageSchema,
    PingMessageSchema,
    PongMessageSchema,
    MatchCreatedMessageSchema,
    GameStateMessageSchema,
    GameViewModelMessageSchema,
    z
      .object({ type: z.literal('actionError'), error: z.string(), code: z.string() })
      .extend(ServerTransportFieldsSchema.shape)
      .describe(
        'Sent when a submitted action is invalid for the current game state (e.g., deploy during AttackPhase).',
      ),
    z
      .object({ type: z.literal('matchError'), error: z.string(), code: z.string() })
      .extend(ServerTransportFieldsSchema.shape)
      .describe('Sent when a match-level operation fails (e.g., match not found, match full).'),
    z
      .object({
        type: z.literal('matchJoined'),
        matchId: z.uuid(),
        playerId: z.uuid().describe('Secret player UUID. Required for rejoinMatch.'),
        playerIndex: z.number().int().min(0).max(1),
      })
      .extend(ServerTransportFieldsSchema.shape)
      .describe('Sent to the second player upon joining an existing match.'),
    z
      .object({
        type: z.literal('spectatorJoined'),
        matchId: z.uuid(),
        spectatorId: z.uuid(),
      })
      .extend(ServerTransportFieldsSchema.shape)
      .describe('Confirms spectator joined the match.'),
    z
      .object({ type: z.literal('opponentDisconnected'), matchId: z.uuid() })
      .extend(ServerTransportFieldsSchema.shape)
      .describe('Notifies that the opponent has disconnected from the WebSocket.'),
    z
      .object({ type: z.literal('opponentReconnected'), matchId: z.uuid() })
      .extend(ServerTransportFieldsSchema.shape)
      .describe('Notifies that the opponent has reconnected to the WebSocket.'),
    z
      .object({
        type: z.literal('authenticated'),
        user: z.object({
          id: z.uuid(),
          name: z.string(),
          gamertag: z.string().optional(),
          suffix: z.number().nullable().optional(),
          elo: z.number().describe('Current Elo rating.'),
        }),
      })
      .extend(ServerTransportFieldsSchema.shape)
      .describe('Confirms successful JWT authentication and returns the user profile.'),
    z
      .object({ type: z.literal('auth_error'), error: z.string() })
      .extend(ServerTransportFieldsSchema.shape)
      .describe('Sent when JWT authentication fails.'),
    z
      .object({
        type: z.literal('queueJoined'),
        queueSize: z.number().int().min(1).describe('Total players currently in the ranked queue.'),
      })
      .extend(ServerTransportFieldsSchema.shape)
      .describe('Confirms the player has been added to the ranked matchmaking queue.'),
    z
      .object({
        type: z.literal('queueLeft'),
        reason: z.enum(['cancelled', 'timeout']).describe('Why the player was removed.'),
      })
      .extend(ServerTransportFieldsSchema.shape)
      .describe('Confirms the player has been removed from the ranked matchmaking queue.'),
    z
      .object({
        type: z.literal('queueMatchFound'),
        matchId: z.uuid(),
        playerId: z.uuid().describe('Secret player UUID. Required for rejoinMatch.'),
        playerIndex: z.number().int().min(0).max(1),
      })
      .extend(ServerTransportFieldsSchema.shape)
      .describe('Sent to both matched players when the ranked queue pairs them.'),
    z
      .object({
        type: z.literal('forceReload'),
        reason: z
          .string()
          .optional()
          .describe('Human-readable reason for the reload (e.g. server update).'),
      })
      .extend(ServerTransportFieldsSchema.shape)
      .describe(
        'Instructs the client to reload the page immediately (e.g. after a server-side deployment).',
      ),
  ])
  .describe(
    'Server-to-Client WebSocket message. The type field determines the message variant. See AsyncAPI spec for the full protocol.',
  );

const WsTelemetrySchema = z
  .object({
    traceparent: z
      .string()
      .optional()
      .describe('Optional W3C traceparent header propagated through the WebSocket message.'),
    tracestate: z
      .string()
      .optional()
      .describe('Optional W3C tracestate header propagated through the WebSocket message.'),
    baggage: z
      .string()
      .optional()
      .describe('Optional W3C baggage header propagated through the WebSocket message.'),
    qaRunId: z
      .string()
      .optional()
      .describe('Optional QA run identifier used to correlate simulator-driven traffic.'),
    sessionId: z
      .string()
      .optional()
      .describe('Optional WebSocket session identifier used to distinguish reconnect cycles.'),
    reconnectAttempt: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe('Optional reconnect attempt counter for the current WebSocket session.'),
    originService: z
      .string()
      .optional()
      .describe('Optional source service name that emitted the WebSocket message.'),
  })
  .describe('Optional telemetry envelope for propagating trace context over WebSocket messages.');

export const ClientMessageSchema = z
  .discriminatedUnion('type', [
    z
      .object({
        type: z.literal('createMatch'),
        playerName: z
          .string()
          .trim()
          .min(1)
          .max(50)
          .describe('Name of the player creating the match.'),
        visibility: z
          .enum(['private', 'public_open'])
          .optional()
          .describe('Optional match visibility. Defaults to private/share-link mode.'),
        gameOptions: GameOptionsSchema.optional().describe('Optional overrides for game logic.'),
        rngSeed: z.number().optional().describe('Fixed seed for deterministic deck shuffling.'),
        opponent: z
          .enum(['human', 'bot-random', 'bot-heuristic'])
          .optional()
          .describe('Type of opponent to match against.'),
        matchParams: CreateMatchParamsPartialSchema.optional().describe(
          'Authoritative match configuration parameters.',
        ),
      })
      .extend(ReliableClientTransportFieldsSchema.shape)
      .extend({
        telemetry: WsTelemetrySchema.optional(),
      })
      .describe('Request to create a new match. Reliable client message; requires msgId.'),
    z
      .object({
        type: z.literal('joinMatch'),
        matchId: z.uuid().describe('UUID of the match to join.'),
        playerName: z.string().trim().min(1).max(50).describe('Name of the player joining.'),
      })
      .extend(ReliableClientTransportFieldsSchema.shape)
      .extend({
        telemetry: WsTelemetrySchema.optional(),
      })
      .describe(
        'Request to join an existing match as the second player. Reliable client message; requires msgId.',
      ),
    z
      .object({
        type: z.literal('rejoinMatch'),
        matchId: z.uuid().describe('UUID of the match to rejoin.'),
        playerId: z.uuid().describe('Player secret ID obtained during initial join/creation.'),
      })
      .extend(ReliableClientTransportFieldsSchema.shape)
      .extend({
        telemetry: WsTelemetrySchema.optional(),
      })
      .describe(
        'Re-establish connection to an active match. Reliable client message; requires msgId.',
      ),
    z
      .object({ type: z.literal('watchMatch'), matchId: z.uuid() })
      .extend(ReliableClientTransportFieldsSchema.shape)
      .extend({
        telemetry: WsTelemetrySchema.optional(),
      })
      .describe('Join a match as a spectator. Reliable client message; requires msgId.'),
    z
      .object({
        type: z.literal('action'),
        matchId: z.uuid().describe('UUID of the match.'),
        action: ActionSchema,
      })
      .extend(ReliableClientTransportFieldsSchema.shape)
      .extend({
        telemetry: WsTelemetrySchema.optional(),
      })
      .describe(
        'Submit a gameplay action. Reliable client message; requires msgId. The action must be valid for the current game phase; see ActionSchema descriptions for phase constraints.',
      ),
    z
      .object({
        type: z.literal('authenticate'),
        token: z.string().describe('JWT token for user authentication.'),
      })
      .extend(ReliableClientTransportFieldsSchema.shape)
      .extend({
        telemetry: WsTelemetrySchema.optional(),
      })
      .describe('Identify the user session via JWT. Reliable client message; requires msgId.'),
    z
      .object({ type: z.literal('joinQueue') })
      .extend(ReliableClientTransportFieldsSchema.shape)
      .extend({ telemetry: WsTelemetrySchema.optional() })
      .describe('Join the ranked matchmaking queue. Requires prior authentication.'),
    z
      .object({ type: z.literal('leaveQueue') })
      .extend(ReliableClientTransportFieldsSchema.shape)
      .extend({ telemetry: WsTelemetrySchema.optional() })
      .describe('Leave the ranked matchmaking queue.'),
    z
      .object({
        type: z.literal('ack'),
        ackedMsgId: MessageIdSchema,
      })
      .extend(ClientTransportFieldsSchema.shape)
      .describe('Acknowledges successful receipt of a server transport message.'),
    z
      .object({
        type: z.literal('ping'),
        timestamp: z.iso.datetime(),
      })
      .extend(ClientTransportFieldsSchema.shape)
      .extend({
        telemetry: WsTelemetrySchema.optional(),
      })
      .describe('Application-level heartbeat ping.'),
    z
      .object({
        type: z.literal('pong'),
        timestamp: z.iso.datetime(),
        replyTo: MessageIdSchema.optional(),
      })
      .extend(ClientTransportFieldsSchema.shape)
      .extend({
        telemetry: WsTelemetrySchema.optional(),
      })
      .describe('Application-level heartbeat pong.'),
  ])
  .describe(
    'Client-to-Server WebSocket message. The type field determines the message variant. See AsyncAPI spec for the full protocol.',
  );

// ── Achievements ──────────────────────────────────────────────────────────

export const AchievementTypeSchema = z
  .enum([
    'FIRST_WIN',
    'FIRST_MATCH',
    'ACE_SLAYER',
    'CLEAN_SWEEP',
    'FULL_HOUSE',
    'ROYAL_GUARD',
    'DOUBLE_DOWN',
    'LAST_STAND',
    'IRON_WALL',
    'HIGH_CARD',
    'COMEBACK_KID',
    'OPENING_GAMBIT',
    'TEN_WINS',
    'FIFTY_WINS',
    'HUNDRED_WINS',
    'DEUCE_COUP',
    'TRIPLE_THREAT',
    'DEAD_MANS_HAND',
    'FLAWLESS_VICTORY',
    'BLITZKRIEG',
    'OVERKILL',
  ])
  .describe('Achievement type identifier. Each type is awarded at most once per player.');

export const AchievementSchema = z
  .object({
    id: z.uuid().describe('Unique achievement record ID.'),
    userId: z.uuid().describe('Player who earned this achievement.'),
    type: AchievementTypeSchema,
    awardedAt: z.iso.datetime().describe('When the achievement was awarded.'),
    matchId: z.string().nullable().describe('Match that triggered the award, if applicable.'),
    metadata: z
      .record(z.string(), z.unknown())
      .describe('Achievement-specific context data (e.g., winning LP, turn count).'),
  })
  .describe('A single achievement earned by a player.');

export const AchievementListSchema = z
  .object({
    userId: z.uuid(),
    achievements: z.array(AchievementSchema),
  })
  .describe('All achievements earned by a player, ordered by most recent first.');

export const SpectatorMatchSummarySchema = z.object({
  matchId: z.string().uuid(),
  status: z.enum(['waiting', 'active']),
  phase: z.string().nullable(),
  turnNumber: z.number().int().nullable(),
  player1Name: z.string().nullable(),
  player2Name: z.string().nullable(),
  spectatorCount: z.number().int(),
  isPvP: z.boolean(),
  humanPlayerCount: z.number().int(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const MatchHistoryEntrySchema = z.object({
  matchId: z.string().uuid(),
  player1Name: z.string(),
  player2Name: z.string(),
  winnerName: z.string().nullable(),
  totalTurns: z.number().int(),
  isPvP: z.boolean(),
  humanPlayerCount: z.number().int(),
  completedAt: z.string().datetime(),
  durationMs: z.number().int().nullable(),
});

export const MatchHistoryPageSchema = z.object({
  matches: z.array(MatchHistoryEntrySchema),
  total: z.number().int(),
});
