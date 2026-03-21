import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { GameOptionsSchema } from '@phalanxduel/shared';
import { validateInternalToken } from '../middleware/internal-auth.js';
import type { MatchManager } from '../match.js';

const CreateMatchBodySchema = z.object({
  playerName: z.string().min(1).max(50),
  opponent: z.enum(['bot-random', 'human']),
  matchParams: z
    .object({
      rows: z.number().int().min(1).max(12).optional(),
      columns: z.number().int().min(1).max(12).optional(),
      maxHandSize: z.number().int().min(0).optional(),
    })
    .optional(),
  gameOptions: z
    .object({
      damageMode: z.enum(['classic', 'cumulative']).optional(),
      startingLifepoints: z.number().int().min(1).max(500).optional(),
    })
    .optional(),
  rngSeed: z.number().optional(),
  userId: z.string().uuid().optional(),
});

export function registerInternalRoutes(fastify: FastifyInstance, matchManager: MatchManager) {
  fastify.post<{ Body: unknown }>('/internal/matches', async (request, reply) => {
    if (!validateInternalToken(request, reply)) return;

    const parsed = CreateMatchBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid body', code: 'VALIDATION_ERROR' });
    }

    const { playerName, opponent, matchParams, gameOptions, rngSeed, userId } = parsed.data;

    if (opponent === 'human') {
      const { matchId } = matchManager.createPendingMatch();
      return reply.status(201).send({ matchId });
    }

    const resolvedGameOptions = gameOptions ? GameOptionsSchema.parse(gameOptions) : undefined;
    const { matchId } = await matchManager.createMatch(playerName, null, {
      gameOptions: resolvedGameOptions,
      rngSeed,
      matchParams,
      userId,
    });

    return reply.status(201).send({ matchId });
  });
}
