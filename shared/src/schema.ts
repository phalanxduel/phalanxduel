import { z } from 'zod';

export const SCHEMA_VERSION = '0.1.0';

export const SuitSchema = z.enum(['spades', 'hearts', 'diamonds', 'clubs']);

export const RankSchema = z.enum([
  'A', '2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K',
]);

export const CardSchema = z.object({
  suit: SuitSchema,
  rank: RankSchema,
});

export const PlayerSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(50),
});

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
