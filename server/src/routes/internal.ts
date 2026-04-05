import type { FastifyInstance } from 'fastify';
import type { WebSocket } from 'ws';
import { z } from 'zod';
import { CreateMatchParamsPartialSchema, GameOptionsSchema } from '@phalanxduel/shared';
import { validateInternalToken } from '../middleware/internal-auth.js';
import type { IMatchManager } from '../match.js';

const CreateMatchBodySchema = z.object({
  playerName: z.string().min(1).max(50),
  opponent: z.enum(['bot-random', 'human']),
  matchParams: CreateMatchParamsPartialSchema.optional(),
  gameOptions: z
    .object({
      damageMode: z.enum(['classic', 'cumulative']).optional(),
      startingLifepoints: z.number().int().min(1).max(500).optional(),
    })
    .optional(),
  rngSeed: z.number().optional(),
  userId: z.uuid().optional(),
});

/**
 * Returns a WebSocket-shaped object that silently discards all messages.
 * Used for admin-initiated matches where no player socket is available.
 * readyState=3 (CLOSED) causes MatchManager to skip all sends.
 */
function makeNullSocket(): WebSocket {
  return {
    readyState: 3,
    send: () => {},
    on: () => {},
    close: () => {},
  } as unknown as WebSocket;
}

export function registerInternalRoutes(fastify: FastifyInstance, matchManager: IMatchManager) {
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

    // Bot match: initialize headlessly using a null socket for P1.
    // Bot turns fire via scheduleBotTurn; results are persisted to DB.
    // Apply GameOptionsSchema defaults (damageMode: 'classic', startingLifepoints: 20)
    // when gameOptions are provided but fields are omitted.
    const resolvedGameOptions = gameOptions ? GameOptionsSchema.parse(gameOptions) : undefined;
    const { matchId } = matchManager.createMatch(playerName, makeNullSocket(), {
      gameOptions: resolvedGameOptions,
      rngSeed,
      matchParams,
      userId,
      botOptions: {
        opponent: 'bot-random',
        botConfig: { strategy: 'random', seed: rngSeed ?? Date.now() },
      },
    });

    return reply.status(201).send({ matchId });
  });
}
