// AUTO-GENERATED — DO NOT EDIT
// Source: shared/src/schema.ts
// Regenerate: pnpm schema:gen

import type { z } from 'zod';
import type {
  ActionDSLSchema,
  ActionSchema,
  BattlefieldCardSchema,
  CardSchema,
  CardTypeSchema,
  ClassicModeTypeSchema,
  ErrorResponseSchema,
  EventStatusSchema,
  EventTypeSchema,
  GameStateMessageSchema,
  GameStateSchema,
  GridPositionSchema,
  MatchConfigClassicSchema,
  MatchCreatedMessageSchema,
  MatchParametersSchema,
  PartialCardSchema,
  PhalanxEventSchema,
  PhalanxTurnResultSchema,
  PlayerSchema,
  PlayerStateSchema,
  ServerMessageSchema,
  SuitSchema,
  TurnPhaseSchema,
} from './schema';

export type ActionDSL = z.infer<typeof ActionDSLSchema>;
export type Action = z.infer<typeof ActionSchema>;
export type BattlefieldCard = z.infer<typeof BattlefieldCardSchema>;
export type Card = z.infer<typeof CardSchema>;
export type CardType = z.infer<typeof CardTypeSchema>;
export type ClassicModeType = z.infer<typeof ClassicModeTypeSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
export type EventStatus = z.infer<typeof EventStatusSchema>;
export type EventType = z.infer<typeof EventTypeSchema>;
export type GameStateMessage = z.infer<typeof GameStateMessageSchema>;
export type GameState = z.infer<typeof GameStateSchema>;
export type GridPosition = z.infer<typeof GridPositionSchema>;
export type MatchConfigClassic = z.infer<typeof MatchConfigClassicSchema>;
export type MatchCreatedMessage = z.infer<typeof MatchCreatedMessageSchema>;
export type MatchParameters = z.infer<typeof MatchParametersSchema>;
export type PartialCard = z.infer<typeof PartialCardSchema>;
export type PhalanxEvent = z.infer<typeof PhalanxEventSchema>;
export type PhalanxTurnResult = z.infer<typeof PhalanxTurnResultSchema>;
export type Player = z.infer<typeof PlayerSchema>;
export type PlayerState = z.infer<typeof PlayerStateSchema>;
export type ServerMessage = z.infer<typeof ServerMessageSchema>;
export type Suit = z.infer<typeof SuitSchema>;
export type TurnPhase = z.infer<typeof TurnPhaseSchema>;
