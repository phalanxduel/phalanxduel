// AUTO-GENERATED — DO NOT EDIT
// Source: shared/src/schema.ts
// Regenerate: pnpm schema:gen

import type { z } from 'zod';
import type {
  ActionResultSchema,
  ActionSchema,
  AttackActionSchema,
  BattlefieldCardSchema,
  BattlefieldSchema,
  CardSchema,
  DeckSchema,
  DeployActionSchema,
  ErrorResponseSchema,
  GamePhaseSchema,
  GameStateSchema,
  GridPositionSchema,
  HealthResponseSchema,
  HeroicalSwapActionSchema,
  MatchConfigSchema,
  PassActionSchema,
  PlayerSchema,
  PlayerStateSchema,
  RankSchema,
  SuitSchema,
  WsMessageEnvelopeSchema,
} from './schema';

export type ActionResult = z.infer<typeof ActionResultSchema>;
export type Action = z.infer<typeof ActionSchema>;
export type AttackAction = z.infer<typeof AttackActionSchema>;
export type BattlefieldCard = z.infer<typeof BattlefieldCardSchema>;
export type Battlefield = z.infer<typeof BattlefieldSchema>;
export type Card = z.infer<typeof CardSchema>;
export type Deck = z.infer<typeof DeckSchema>;
export type DeployAction = z.infer<typeof DeployActionSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
export type GamePhase = z.infer<typeof GamePhaseSchema>;
export type GameState = z.infer<typeof GameStateSchema>;
export type GridPosition = z.infer<typeof GridPositionSchema>;
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
export type HeroicalSwapAction = z.infer<typeof HeroicalSwapActionSchema>;
export type MatchConfig = z.infer<typeof MatchConfigSchema>;
export type PassAction = z.infer<typeof PassActionSchema>;
export type Player = z.infer<typeof PlayerSchema>;
export type PlayerState = z.infer<typeof PlayerStateSchema>;
export type Rank = z.infer<typeof RankSchema>;
export type Suit = z.infer<typeof SuitSchema>;
export type WsMessageEnvelope = z.infer<typeof WsMessageEnvelopeSchema>;
