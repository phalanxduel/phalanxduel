import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ErrorResponseSchema } from '@phalanxduel/shared';
import { traceHttpHandler, httpTraceContext } from '../tracing.js';
import { toJsonSchema } from '../utils/openapi.js';
import { PlayerRatingsService } from '../ratings.js';

export function registerProfileRoutes(fastify: FastifyInstance): void {
  const ratings = new PlayerRatingsService();

  const ProfileSchema = z.object({
    userId: z.uuid(),
    gamertag: z.string(),
    displayName: z.string(),
    elo: z.number().int(),
    record: z.object({
      wins: z.number().int(),
      losses: z.number().int(),
      draws: z.number().int(),
      gamesPlayed: z.number().int(),
    }),
    streak: z.number().int(),
    confidenceLabel: z.enum(['Provisional', 'Calibrating', 'Established', 'Inactive']),
    recentMatches: z.array(
      z.object({
        matchId: z.uuid(),
        result: z.enum(['win', 'loss', 'draw']),
        mode: z.enum(['pvp', 'sp-random', 'sp-heuristic']),
        opponentName: z.string().nullable(),
        completedAt: z.iso.datetime(),
        turnNumber: z.number().int().nullable(),
      }),
    ),
    openChallenges: z.array(
      z.object({
        matchId: z.uuid(),
        createdAt: z.iso.datetime(),
        createdAtIso: z.iso.datetime(),
        creatorName: z.string(),
        creatorElo: z.number().int(),
        creatorRecord: z.object({
          wins: z.number().int(),
          losses: z.number().int(),
          draws: z.number().int(),
          gamesPlayed: z.number().int(),
          provisional: z.boolean(),
          confidenceLabel: z.enum(['Provisional', 'Calibrating', 'Established', 'Inactive']),
        }),
        requirements: z.object({
          minPublicRating: z.number().int().nullable(),
          maxPublicRating: z.number().int().nullable(),
          minGamesPlayed: z.number().int().nullable(),
          requiresEstablishedRating: z.boolean(),
        }),
      }),
    ),
  });

  fastify.get<{ Params: { userId: string } }>(
    '/api/profiles/:userId',
    {
      schema: {
        tags: ['profiles'],
        summary: 'Get a public player profile',
        description:
          'Returns a public read model derived from match results and player ratings without exposing raw Glicko internals.',
        params: toJsonSchema(
          z.object({
            userId: z.uuid(),
          }),
        ),
        response: {
          200: toJsonSchema(ProfileSchema),
          404: toJsonSchema(ErrorResponseSchema),
          503: toJsonSchema(ErrorResponseSchema),
        },
      },
    },
    async (request, reply) => {
      return traceHttpHandler('profiles.public', httpTraceContext(request, reply), async () => {
        const profile = await ratings.getPublicProfile(request.params.userId);
        if (!profile) {
          void reply.status(404);
          return { error: 'User not found', code: 'USER_NOT_FOUND' };
        }
        return profile;
      });
    },
  );
}
