// AUTO-GENERATED — DO NOT EDIT
// Source: shared/src/schema.ts
// Regenerate: pnpm schema:gen

import type { z } from 'zod';
import type {
  ActionErrorMessageSchema,
  ActionResultSchema,
  ActionSchema,
  AttackActionSchema,
  BattlefieldCardSchema,
  BattlefieldSchema,
  CardSchema,
  ClientMessageSchema,
  CreateMatchMessageSchema,
  DeckSchema,
  DeployActionSchema,
  ErrorResponseSchema,
  GamePhaseSchema,
  GameStateMessageSchema,
  GameStateSchema,
  GridPositionSchema,
  HealthResponseSchema,
  JoinMatchMessageSchema,
  MatchConfigSchema,
  MatchCreatedMessageSchema,
  MatchErrorMessageSchema,
  MatchJoinedMessageSchema,
  OpponentDisconnectedMessageSchema,
  OpponentReconnectedMessageSchema,
  PassActionSchema,
  PlayerActionMessageSchema,
  PlayerSchema,
  PlayerStateSchema,
  RankSchema,
  ServerMessageSchema,
  SuitSchema,
  WsMessageEnvelopeSchema,
} from './schema';

export type ActionErrorMessage = z.infer<typeof ActionErrorMessageSchema>;
export type ActionResult = z.infer<typeof ActionResultSchema>;
export type Action = z.infer<typeof ActionSchema>;
export type AttackAction = z.infer<typeof AttackActionSchema>;
export type BattlefieldCard = z.infer<typeof BattlefieldCardSchema>;
export type Battlefield = z.infer<typeof BattlefieldSchema>;
export type Card = z.infer<typeof CardSchema>;
export type ClientMessage = z.infer<typeof ClientMessageSchema>;
export type CreateMatchMessage = z.infer<typeof CreateMatchMessageSchema>;
export type Deck = z.infer<typeof DeckSchema>;
export type DeployAction = z.infer<typeof DeployActionSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
export type GamePhase = z.infer<typeof GamePhaseSchema>;
export type GameStateMessage = z.infer<typeof GameStateMessageSchema>;
export type GameState = z.infer<typeof GameStateSchema>;
export type GridPosition = z.infer<typeof GridPositionSchema>;
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
export type JoinMatchMessage = z.infer<typeof JoinMatchMessageSchema>;
export type MatchConfig = z.infer<typeof MatchConfigSchema>;
export type MatchCreatedMessage = z.infer<typeof MatchCreatedMessageSchema>;
export type MatchErrorMessage = z.infer<typeof MatchErrorMessageSchema>;
export type MatchJoinedMessage = z.infer<typeof MatchJoinedMessageSchema>;
export type OpponentDisconnectedMessage = z.infer<typeof OpponentDisconnectedMessageSchema>;
export type OpponentReconnectedMessage = z.infer<typeof OpponentReconnectedMessageSchema>;
export type PassAction = z.infer<typeof PassActionSchema>;
export type PlayerActionMessage = z.infer<typeof PlayerActionMessageSchema>;
export type Player = z.infer<typeof PlayerSchema>;
export type PlayerState = z.infer<typeof PlayerStateSchema>;
export type Rank = z.infer<typeof RankSchema>;
export type ServerMessage = z.infer<typeof ServerMessageSchema>;
export type Suit = z.infer<typeof SuitSchema>;
export type WsMessageEnvelope = z.infer<typeof WsMessageEnvelopeSchema>;
