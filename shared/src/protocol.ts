/**
 * Copyright © 2026 Mike Hall
 * Licensed under the GNU Affero General Public License v3.0.
 *
 * Phalanx System — Deterministic Protocol v1.0
 * Defines the client-to-server intent protocol and server-to-client action availability.
 */

import { z } from 'zod';
import { GridPositionSchema } from './schema.js';

// --- Player Intent (Client -> Server) ---

export const PlayCardIntentSchema = z.object({
  type: z.literal('playCard'),
  cardId: z.string().describe('ID of the card to play.'),
  position: GridPositionSchema.describe('Target battlefield position.'),
});

export const AttackIntentSchema = z.object({
  type: z.literal('attack'),
  attackerId: z.string().describe('ID of the card attacking.'),
  targetId: z.string().describe('ID of the target (card or player).'),
});

export const EndTurnIntentSchema = z.object({
  type: z.literal('endTurn'),
});

export const PlayerIntentSchema = z.discriminatedUnion('type', [
  PlayCardIntentSchema,
  AttackIntentSchema,
  EndTurnIntentSchema,
]);

export type PlayerIntent = z.infer<typeof PlayerIntentSchema>;

// --- Legal Actions (Server -> Client) ---

export const LegalActionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('playCard'),
    cardId: z.string(),
    validPositions: z.array(GridPositionSchema),
  }),
  z.object({
    type: z.literal('attack'),
    attackerId: z.string(),
    validTargets: z.array(z.string()),
  }),
  z.object({
    type: z.literal('endTurn'),
  }),
]);

export type LegalAction = z.infer<typeof LegalActionSchema>;

// --- Cues (Server -> Client for Animation/Audio) ---

export const AnimationCueSchema = z.object({
  type: z.string(),
  targetId: z.string().optional(),
  data: z.record(z.string(), z.unknown()).optional(),
});

export type AnimationCue = z.infer<typeof AnimationCueSchema>;

export const AudioCueSchema = z.object({
  type: z.string(),
  volume: z.number().optional(),
});

export type AudioCue = z.infer<typeof AudioCueSchema>;
