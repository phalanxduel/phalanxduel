import type { FastifyInstance } from 'fastify';
import type { WebSocket } from 'ws';
import { z } from 'zod';
import { CreateMatchParamsPartialSchema, GameOptionsSchema } from '@phalanxduel/shared';
import { computeStateHash } from '@phalanxduel/shared/hash';
import { replayGame } from '@phalanxduel/engine';
import { validateInternalToken } from '../middleware/internal-auth.js';
import type { IMatchManager } from '../match-types.js';
import { db } from '../db/index.js';
import { playerRatings } from '../db/schema.js';
import { and, eq } from 'drizzle-orm';
import { getAbTestsSnapshotFromEnv } from '../abTests.js';

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

const RatingParamsSchema = z.object({
  userId: z.uuid(),
  mode: z.enum(['pvp', 'sp-random', 'sp-heuristic']),
});

type RatingMode = z.infer<typeof RatingParamsSchema>['mode'];
type PlayerRatingRow = typeof playerRatings.$inferSelect;

function baselineRatingPayload(userId: string, mode: RatingMode) {
  return {
    userId,
    mode,
    eloRating: 1000,
    glickoRating: 1500,
    glickoRatingDeviation: 350,
    glickoVolatility: 0.06,
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    provisional: true,
    lastRatedAt: null,
  };
}

function ratingPayload(userId: string, mode: RatingMode, row: PlayerRatingRow | undefined) {
  if (!row) return baselineRatingPayload(userId, mode);
  return {
    userId,
    mode,
    eloRating: row.eloRating,
    glickoRating: row.glickoRating,
    glickoRatingDeviation: row.glickoRatingDeviation,
    glickoVolatility: row.glickoVolatility,
    gamesPlayed: row.gamesPlayed,
    wins: row.wins,
    losses: row.losses,
    draws: row.draws,
    provisional: row.provisional,
    lastRatedAt: row.lastRatedAt?.toISOString() ?? null,
  };
}

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
      const { matchId } = await matchManager.createPendingMatch();
      return reply.status(201).send({ matchId });
    }

    // Bot match: initialize headlessly using a null socket for P1.
    // Bot turns fire via scheduleBotTurn; results are persisted to DB.
    // Apply GameOptionsSchema defaults (damageMode: 'classic', startingLifepoints: 20)
    // when gameOptions are provided but fields are omitted.
    const resolvedGameOptions = gameOptions ? GameOptionsSchema.parse(gameOptions) : undefined;
    const { matchId } = await matchManager.createMatch(playerName, makeNullSocket(), {
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

  fastify.post<{ Params: unknown }>('/internal/matches/:id/terminate', async (request, reply) => {
    if (!validateInternalToken(request, reply)) return;

    const parsed = z.object({ id: z.string().min(1) }).safeParse(request.params);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid params', code: 'VALIDATION_ERROR' });
    }

    const terminated = await matchManager.terminateMatch(parsed.data.id);
    if (!terminated) {
      return reply
        .status(404)
        .send({ error: 'Match not found or already resolved', code: 'NOT_FOUND' });
    }
    return reply.status(200).send({ terminated: true });
  });

  fastify.get<{ Params: unknown }>(
    '/internal/matches/:id/replay',
    { schema: { hide: true } },
    async (request, reply) => {
      if (!validateInternalToken(request, reply)) return;

      const parsed = z.object({ id: z.uuid() }).safeParse(request.params);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'Invalid params', code: 'VALIDATION_ERROR' });
      }

      const match = await matchManager.getMatch(parsed.data.id);
      if (!match?.config) {
        return reply.status(404).send({ error: 'Match not found', code: 'MATCH_NOT_FOUND' });
      }

      const result = replayGame(match.config, match.actionHistory, { hashFn: computeStateHash });
      return reply.status(200).send({
        valid: result.valid,
        actionCount: match.actionHistory.length,
        finalStateHash: computeStateHash(result.finalState),
        ...(result.error ? { error: result.error, failedAtIndex: result.failedAtIndex } : {}),
      });
    },
  );

  fastify.get('/internal/admin/ab-tests', { schema: { hide: true } }, async (request, reply) => {
    if (!validateInternalToken(request, reply)) return;
    return reply.status(200).send(getAbTestsSnapshotFromEnv());
  });

  fastify.post<{ Params: unknown; Body: unknown }>(
    '/internal/matches/:id/rollback',
    async (request, reply) => {
      if (!validateInternalToken(request, reply)) return;

      const parsedParams = z.object({ id: z.string().min(1) }).safeParse(request.params);
      const parsedBody = z
        .object({ targetSequenceNumber: z.number().int().min(0) })
        .safeParse(request.body);

      if (!parsedParams.success || !parsedBody.success) {
        return reply.status(400).send({ error: 'Invalid input', code: 'VALIDATION_ERROR' });
      }

      const success = await matchManager.rollbackMatch(
        parsedParams.data.id,
        parsedBody.data.targetSequenceNumber,
      );
      if (!success) {
        return reply
          .status(404)
          .send({ error: 'Rollback failed: Match or sequence not found', code: 'NOT_FOUND' });
      }
      return reply.status(200).send({ success: true });
    },
  );

  // --- Moderation Routes ---

  fastify.post<{ Params: { id: string }; Body: { reason: string; actorId: string } }>(
    '/internal/users/:id/disable',
    async (request, reply) => {
      if (!validateInternalToken(request, reply)) return;
      const { id } = request.params;
      const { reason, actorId } = request.body;
      const { ModerationService } = await import('../services/moderation-service.js');
      const success = await new ModerationService().disableUser(id, reason, actorId);
      return { success };
    },
  );

  fastify.post<{ Params: { id: string }; Body: { actorId: string } }>(
    '/internal/users/:id/purge',
    async (request, reply) => {
      if (!validateInternalToken(request, reply)) return;
      const { id } = request.params;
      const { actorId } = request.body;
      const { ModerationService } = await import('../services/moderation-service.js');
      const success = await new ModerationService().purgeUserData(id, actorId);
      return { success };
    },
  );

  fastify.post<{ Params: { id: string }; Body: { reason: string; actorId: string } }>(
    '/internal/comments/:id/remove',
    async (request, reply) => {
      if (!validateInternalToken(request, reply)) return;
      const { id } = request.params;
      const { reason, actorId } = request.body;
      const { ModerationService } = await import('../services/moderation-service.js');
      const success = await new ModerationService().removeComment(id, reason, actorId);
      return { success };
    },
  );

  fastify.post('/internal/broadcast/reload', async (request, reply) => {
    if (!validateInternalToken(request, reply)) return;
    const { reason } = z.object({ reason: z.string().optional() }).parse(request.body ?? {});
    matchManager.broadcastToAll({ type: 'forceReload', ...(reason ? { reason } : {}) });
    return reply.status(200).send({ sent: true });
  });

  fastify.get<{ Params: unknown }>('/internal/ratings/:userId/:mode', async (request, reply) => {
    if (!validateInternalToken(request, reply)) return;

    const parsed = RatingParamsSchema.safeParse(request.params);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid params', code: 'VALIDATION_ERROR' });
    }

    const database = db;
    if (!database) {
      return reply
        .status(503)
        .send({ error: 'Database not available', code: 'DATABASE_UNAVAILABLE' });
    }

    const { userId, mode } = parsed.data;
    const [row] = await database
      .select()
      .from(playerRatings)
      .where(and(eq(playerRatings.userId, userId), eq(playerRatings.mode, mode)))
      .limit(1);

    return ratingPayload(userId, mode, row);
  });
}
