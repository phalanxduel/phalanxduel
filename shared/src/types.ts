// AUTO-GENERATED — DO NOT EDIT
// Source: shared/src/schema.ts
// Regenerate: pnpm schema:gen

import type { z } from 'zod';
import type {
  CardSchema,
  ErrorResponseSchema,
  HealthResponseSchema,
  MatchConfigSchema,
  PlayerSchema,
  RankSchema,
  SuitSchema,
  WsMessageEnvelopeSchema,
} from './schema';

export type Card = z.infer<typeof CardSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
export type MatchConfig = z.infer<typeof MatchConfigSchema>;
export type Player = z.infer<typeof PlayerSchema>;
export type Rank = z.infer<typeof RankSchema>;
export type Suit = z.infer<typeof SuitSchema>;
export type WsMessageEnvelope = z.infer<typeof WsMessageEnvelopeSchema>;
