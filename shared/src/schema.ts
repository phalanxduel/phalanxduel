/**
 * Copyright © 2026 Mike Hall
 * Licensed under the GNU General Public License v3.0.
 */

import { z } from 'zod';

export const SCHEMA_VERSION = '0.2.3-rev.17';

const SeedSchema = z.number().int().safe();

// --- Base schemas ---

export const SuitSchema = z.enum(['spades', 'hearts', 'diamonds', 'clubs']);

export const RankSchema = z.enum([
  'A', '2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K',
]);

/**
 * Represents a standard playing card in the Phalanx Duel game.
 */
export const CardSchema = z.object({
  /** The suit of the card. */
  suit: SuitSchema,
  /** The rank of the card. */
  rank: RankSchema,
});

export const PlayerSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(50),
});

// --- Infrastructure schemas ---

export const MatchConfigSchema = z.object({
  matchId: z.string().uuid(),
  players: z.array(PlayerSchema).min(2),
  createdAt: z.string().datetime(),
});

export const WsMessageEnvelopeSchema = z.object({
  type: z.string(),
  payload: z.unknown(),
  timestamp: z.string().datetime(),
  matchId: z.string().uuid().optional(),
  playerId: z.string().uuid().optional(),
});

export const ErrorResponseSchema = z.object({
  error: z.string(),
  code: z.string(),
  details: z.unknown().optional(),
});

export const HealthResponseSchema = z.object({
  status: z.enum(['ok', 'degraded', 'error']),
  timestamp: z.string().datetime(),
  version: z.string(),
});

// --- Gameplay schemas ---

/** Numeric value lookup: A=1, 2-9=face, T=10, J/Q/K=11 */
export const RANK_VALUES: Record<string, number> = {
  A: 1, '2': 2, '3': 3, '4': 4, '5': 5,
  '6': 6, '7': 7, '8': 8, '9': 9, T: 10,
  J: 11, Q: 11, K: 11,
};

export const DeckSchema = z.array(CardSchema).min(1);

export const GridPositionSchema = z.object({
  row: z.number().int().min(0).max(1),
  col: z.number().int().min(0).max(3),
});

export const BattlefieldCardSchema = z.object({
  card: CardSchema,
  position: GridPositionSchema,
  currentHp: z.number().int().min(0),
  faceDown: z.boolean(),
});

/** 2×4 grid — 8 slots, each either a BattlefieldCard or null (empty) */
export const BattlefieldSchema = z.array(
  z.union([BattlefieldCardSchema, z.null()]),
).length(8);

export const PlayerStateSchema = z.object({
  player: PlayerSchema,
  hand: z.array(CardSchema),
  battlefield: BattlefieldSchema,
  drawpile: z.array(CardSchema),
  discardPile: z.array(CardSchema),
  lifepoints: z.number().int().min(0),
  handCount: z.number().int().min(0).optional(),
  drawpileCount: z.number().int().min(0).optional(),
});

export const GamePhaseSchema = z.enum([
  'setup',
  'deployment',
  'combat',
  'reinforcement',
  'gameOver',
]);

export const CombatBonusTypeSchema = z.enum([
  'aceInvulnerable',
  'aceVsAce',
  'diamondDeathShield',
  'clubDoubleOverflow',
  'spadeDoubleLp',
  'heartDeathShield',
]);

export const CombatLogStepSchema = z.object({
  target: z.enum(['frontCard', 'backCard', 'playerLp']),
  card: CardSchema.optional(),
  incomingDamage: z.number().int(),
  hpBefore: z.number().int().optional(),
  effectiveHp: z.number().int().optional(),
  absorbed: z.number().int().optional(),
  overflow: z.number().int().optional(),
  damage: z.number().int(),
  hpAfter: z.number().int().optional(),
  destroyed: z.boolean().optional(),
  lpBefore: z.number().int().optional(),
  lpAfter: z.number().int().optional(),
  bonuses: z.array(CombatBonusTypeSchema).optional(),
});

export const CombatLogEntrySchema = z.object({
  turnNumber: z.number().int().min(0),
  attackerPlayerIndex: z.number().int().min(0).max(1),
  attackerCard: CardSchema,
  targetColumn: z.number().int().min(0).max(3),
  baseDamage: z.number().int(),
  steps: z.array(CombatLogStepSchema),
  totalLpDamage: z.number().int(),
});

export const ReinforcementContextSchema = z.object({
  column: z.number().int().min(0).max(3),
  attackerIndex: z.number().int().min(0).max(1),
});

export const DamageModeSchema = z.enum(['cumulative', 'per-turn']);

export const GameOptionsSchema = z.object({
  damageMode: DamageModeSchema.default('cumulative'),
  rngSeed: SeedSchema.optional(),
}).default({ damageMode: 'cumulative' });

export const VictoryTypeSchema = z.enum(['lpDepletion', 'cardDepletion', 'forfeit']);

export const GameOutcomeSchema = z.object({
  winnerIndex: z.number().int().min(0).max(1),
  victoryType: VictoryTypeSchema,
  turnNumber: z.number().int().min(0),
});

export const DeployActionSchema = z.object({
  type: z.literal('deploy'),
  playerIndex: z.number().int().min(0).max(1),
  card: CardSchema,
  column: z.number().int().min(0).max(3),
});

export const AttackActionSchema = z.object({
  type: z.literal('attack'),
  playerIndex: z.number().int().min(0).max(1),
  attackerPosition: GridPositionSchema,
  targetPosition: GridPositionSchema,
});

export const PassActionSchema = z.object({
  type: z.literal('pass'),
  playerIndex: z.number().int().min(0).max(1),
});

export const ReinforceActionSchema = z.object({
  type: z.literal('reinforce'),
  playerIndex: z.number().int().min(0).max(1),
  card: CardSchema,
});

export const ForfeitActionSchema = z.object({
  type: z.literal('forfeit'),
  playerIndex: z.number().int().min(0).max(1),
});

export const ActionSchema = z.discriminatedUnion('type', [
  DeployActionSchema,
  AttackActionSchema,
  PassActionSchema,
  ReinforceActionSchema,
  ForfeitActionSchema,
]);

// --- Transaction Log schemas ---

export const TransactionDetailDeploySchema = z.object({
  type: z.literal('deploy'),
  gridIndex: z.number().int().min(0).max(7),
  phaseAfter: GamePhaseSchema,
});

export const TransactionDetailAttackSchema = z.object({
  type: z.literal('attack'),
  combat: CombatLogEntrySchema,
  reinforcementTriggered: z.boolean(),
  victoryTriggered: z.boolean(),
});

export const TransactionDetailPassSchema = z.object({
  type: z.literal('pass'),
});

export const TransactionDetailReinforceSchema = z.object({
  type: z.literal('reinforce'),
  column: z.number().int().min(0).max(3),
  gridIndex: z.number().int().min(0).max(7),
  cardsDrawn: z.number().int().min(0),
  reinforcementComplete: z.boolean(),
});

export const TransactionDetailForfeitSchema = z.object({
  type: z.literal('forfeit'),
  winnerIndex: z.number().int().min(0).max(1),
});

export const TransactionDetailSchema = z.discriminatedUnion('type', [
  TransactionDetailDeploySchema,
  TransactionDetailAttackSchema,
  TransactionDetailPassSchema,
  TransactionDetailReinforceSchema,
  TransactionDetailForfeitSchema,
]);

export const TransactionLogEntrySchema = z.object({
  sequenceNumber: z.number().int().min(0),
  action: ActionSchema,
  stateHashBefore: z.string(),
  stateHashAfter: z.string(),
  timestamp: z.string().datetime(),
  details: TransactionDetailSchema,
});

// --- Game State schema (after Action + TransactionLog for dependency order) ---

/**
 * Defines the entire data model for a Phalanx Duel match.
 * 
 * @remarks
 * This is the primary object for state-sync between the server and the client.
 */
export const GameStateSchema = z.object({
  players: z.array(PlayerStateSchema).length(2),
  activePlayerIndex: z.number().int().min(0).max(1),
  phase: GamePhaseSchema,
  turnNumber: z.number().int().min(0),
  rngSeed: z.number(),
  deploymentOrder: z.array(z.number().int().min(0).max(1)).nullish(),
  reinforcement: ReinforcementContextSchema.nullish(),
  transactionLog: z.array(TransactionLogEntrySchema).optional(),
  outcome: GameOutcomeSchema.nullish(),
  gameOptions: GameOptionsSchema.nullish(),
});

export const ActionResultSchema = z.discriminatedUnion('ok', [
  z.object({
    ok: z.literal(true),
    state: GameStateSchema,
  }),
  z.object({
    ok: z.literal(false),
    error: z.string(),
    code: z.string(),
  }),
]);

// --- WebSocket protocol schemas ---

// Client → Server messages
export const CreateMatchMessageSchema = z.object({
  type: z.literal('createMatch'),
  playerName: z.string().min(1).max(50),
  rngSeed: SeedSchema.optional(),
  gameOptions: z.object({
    damageMode: DamageModeSchema.default('cumulative'),
    rngSeed: SeedSchema.optional(),
  }).optional(),
});

export const JoinMatchMessageSchema = z.object({
  type: z.literal('joinMatch'),
  matchId: z.string().uuid(),
  playerName: z.string().min(1).max(50),
});

export const PlayerActionMessageSchema = z.object({
  type: z.literal('action'),
  matchId: z.string().uuid(),
  action: ActionSchema,
});

export const WatchMatchMessageSchema = z.object({
  type: z.literal('watchMatch'),
  matchId: z.string().uuid(),
});

export const ClientMessageSchema = z.discriminatedUnion('type', [
  CreateMatchMessageSchema,
  JoinMatchMessageSchema,
  PlayerActionMessageSchema,
  WatchMatchMessageSchema,
]);

// Server → Client messages
export const MatchCreatedMessageSchema = z.object({
  type: z.literal('matchCreated'),
  matchId: z.string().uuid(),
  playerId: z.string().uuid(),
  playerIndex: z.number().int().min(0).max(1),
});

export const MatchJoinedMessageSchema = z.object({
  type: z.literal('matchJoined'),
  matchId: z.string().uuid(),
  playerId: z.string().uuid(),
  playerIndex: z.number().int().min(0).max(1),
});

export const GameStateMessageSchema = z.object({
  type: z.literal('gameState'),
  matchId: z.string().uuid(),
  state: GameStateSchema,
  spectatorCount: z.number().int().min(0).optional(),
});

export const ActionErrorMessageSchema = z.object({
  type: z.literal('actionError'),
  matchId: z.string().uuid(),
  error: z.string(),
  code: z.string(),
});

export const MatchErrorMessageSchema = z.object({
  type: z.literal('matchError'),
  error: z.string(),
  code: z.string(),
});

export const OpponentDisconnectedMessageSchema = z.object({
  type: z.literal('opponentDisconnected'),
  matchId: z.string().uuid(),
});

export const OpponentReconnectedMessageSchema = z.object({
  type: z.literal('opponentReconnected'),
  matchId: z.string().uuid(),
});

export const SpectatorJoinedMessageSchema = z.object({
  type: z.literal('spectatorJoined'),
  matchId: z.string().uuid(),
  spectatorId: z.string().uuid(),
});

export const ServerMessageSchema = z.discriminatedUnion('type', [
  MatchCreatedMessageSchema,
  MatchJoinedMessageSchema,
  GameStateMessageSchema,
  ActionErrorMessageSchema,
  MatchErrorMessageSchema,
  OpponentDisconnectedMessageSchema,
  OpponentReconnectedMessageSchema,
  SpectatorJoinedMessageSchema,
]);
