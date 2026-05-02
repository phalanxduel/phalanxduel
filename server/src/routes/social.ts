import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { ErrorResponseSchema, SpectatorMatchSummarySchema } from '@phalanxduel/shared';
import { traceHttpHandler, httpTraceContext } from '../tracing.js';
import { toJsonSchema } from '../utils/openapi.js';
import { UserRepository } from '../db/user-repo.js';
import { MatchRepository } from '../db/match-repo.js';

export function registerSocialRoutes(fastify: FastifyInstance): void {
  const userRepo = new UserRepository();
  const matchRepo = new MatchRepository();

  const getAuthUser = async (request: FastifyRequest) => {
    try {
      let token = request.headers.authorization?.replace('Bearer ', '');
      const reqWithCookies = request as FastifyRequest & { cookies: Record<string, string> };
      token ??= reqWithCookies.cookies?.phalanx_refresh;
      if (!token) return null;
      return fastify.jwt.verify<{ id: string; gamertag: string; suffix: number }>(token);
    } catch {
      return null;
    }
  };

  const CommentSchema = z.object({
    id: z.uuid(),
    userId: z.uuid(),
    gamertag: z.string(),
    avatarIcon: z.string().nullable(),
    content: z.string(),
    step: z.number().int().nullable(),
    createdAt: z.string().datetime(),
  });

  const MatchSocialStatsSchema = z.object({
    averageRating: z.number(),
    totalRatings: z.number().int(),
    favoriteCount: z.number().int(),
  });

  const FollowStatsSchema = z.object({
    followers: z.number().int(),
    following: z.number().int(),
  });

  // --- Follow Endpoints ---

  fastify.post<{ Params: { targetUserId: string } }>(
    '/api/users/:targetUserId/follow',
    {
      schema: {
        tags: ['social'],
        summary: 'Follow a user',
        params: toJsonSchema(z.object({ targetUserId: z.uuid() })),
        response: {
          204: { type: 'null', description: 'User followed successfully' },
          401: toJsonSchema(ErrorResponseSchema),
          404: toJsonSchema(ErrorResponseSchema),
        },
      },
    },
    async (request, reply) => {
      const user = await getAuthUser(request);
      if (!user) return reply.status(401).send({ error: 'Unauthorized', code: 'UNAUTHORIZED' });

      return traceHttpHandler('social.follow', httpTraceContext(request, reply), async () => {
        const followerId = user.id;
        const followingId = request.params.targetUserId;

        if (followerId === followingId) {
          void reply.status(400);
          return { error: 'Cannot follow yourself', code: 'SELF_FOLLOW_PROHIBITED' };
        }

        await userRepo.followUser(followerId, followingId);
        void reply.status(204);
        return null;
      });
    },
  );

  fastify.delete<{ Params: { targetUserId: string } }>(
    '/api/users/:targetUserId/follow',
    {
      schema: {
        tags: ['social'],
        summary: 'Unfollow a user',
        params: toJsonSchema(z.object({ targetUserId: z.uuid() })),
        response: {
          204: { type: 'null', description: 'User unfollowed successfully' },
          401: toJsonSchema(ErrorResponseSchema),
        },
      },
    },
    async (request, reply) => {
      const user = await getAuthUser(request);
      if (!user) return reply.status(401).send({ error: 'Unauthorized', code: 'UNAUTHORIZED' });

      return traceHttpHandler('social.unfollow', httpTraceContext(request, reply), async () => {
        const followerId = user.id;
        const followingId = request.params.targetUserId;

        await userRepo.unfollowUser(followerId, followingId);
        void reply.status(204);
        return null;
      });
    },
  );

  fastify.get<{ Params: { userId: string } }>(
    '/api/users/:userId/follow-stats',
    {
      schema: {
        tags: ['social'],
        summary: 'Get follow stats for a user',
        params: toJsonSchema(z.object({ userId: z.uuid() })),
        response: {
          200: toJsonSchema(FollowStatsSchema),
          404: toJsonSchema(ErrorResponseSchema),
        },
      },
    },
    async (request, reply) => {
      return traceHttpHandler('social.follow_stats', httpTraceContext(request, reply), async () => {
        const stats = await userRepo.getFollowStats(request.params.userId);
        return stats;
      });
    },
  );

  // --- Favorite Endpoints ---

  fastify.post<{ Params: { matchId: string } }>(
    '/api/matches/:matchId/favorite',
    {
      schema: {
        tags: ['social'],
        summary: 'Favorite a match',
        params: toJsonSchema(z.object({ matchId: z.uuid() })),
        response: {
          204: { type: 'null', description: 'Match favorited successfully' },
          401: toJsonSchema(ErrorResponseSchema),
        },
      },
    },
    async (request, reply) => {
      const user = await getAuthUser(request);
      if (!user) return reply.status(401).send({ error: 'Unauthorized', code: 'UNAUTHORIZED' });

      return traceHttpHandler('social.favorite', httpTraceContext(request, reply), async () => {
        await matchRepo.favoriteMatch(user.id, request.params.matchId);
        void reply.status(204);
        return null;
      });
    },
  );

  fastify.delete<{ Params: { matchId: string } }>(
    '/api/matches/:matchId/favorite',
    {
      schema: {
        tags: ['social'],
        summary: 'Unfavorite a match',
        params: toJsonSchema(z.object({ matchId: z.uuid() })),
        response: {
          204: { type: 'null', description: 'Match unfavorited successfully' },
          401: toJsonSchema(ErrorResponseSchema),
        },
      },
    },
    async (request, reply) => {
      const user = await getAuthUser(request);
      if (!user) return reply.status(401).send({ error: 'Unauthorized', code: 'UNAUTHORIZED' });

      return traceHttpHandler('social.unfavorite', httpTraceContext(request, reply), async () => {
        await matchRepo.unfavoriteMatch(user.id, request.params.matchId);
        void reply.status(204);
        return null;
      });
    },
  );

  fastify.get<{ Params: { userId: string } }>(
    '/api/users/:userId/favorites',
    {
      schema: {
        tags: ['social'],
        summary: 'Get favorite matches for a user',
        params: toJsonSchema(z.object({ userId: z.uuid() })),
        response: {
          200: toJsonSchema(z.array(SpectatorMatchSummarySchema)),
        },
      },
    },
    async (request, reply) => {
      return traceHttpHandler('social.list_favorites', httpTraceContext(request, reply), async () => {
        return await matchRepo.listUserFavorites(request.params.userId);
      });
    },
  );

  // --- Rating Endpoints ---

  fastify.post<{ Params: { matchId: string }; Body: { rating: number } }>(
    '/api/matches/:matchId/rate',
    {
      schema: {
        tags: ['social'],
        summary: 'Rate a match',
        params: toJsonSchema(z.object({ matchId: z.uuid() })),
        body: toJsonSchema(z.object({ rating: z.number().int().min(1).max(5) })),
        response: {
          204: { type: 'null', description: 'Match rated successfully' },
          401: toJsonSchema(ErrorResponseSchema),
        },
      },
    },
    async (request, reply) => {
      const user = await getAuthUser(request);
      if (!user) return reply.status(401).send({ error: 'Unauthorized', code: 'UNAUTHORIZED' });

      return traceHttpHandler('social.rate', httpTraceContext(request, reply), async () => {
        await matchRepo.rateMatch(user.id, request.params.matchId, request.body.rating);
        void reply.status(204);
        return null;
      });
    },
  );

  fastify.get<{ Params: { matchId: string } }>(
    '/api/matches/:matchId/social-stats',
    {
      schema: {
        tags: ['social'],
        summary: 'Get social stats for a match',
        params: toJsonSchema(z.object({ matchId: z.uuid() })),
        response: {
          200: toJsonSchema(MatchSocialStatsSchema),
        },
      },
    },
    async (request, reply) => {
      return traceHttpHandler('social.match_stats', httpTraceContext(request, reply), async () => {
        return await matchRepo.getMatchSocialStats(request.params.matchId);
      });
    },
  );

  // --- Comment Endpoints ---

  fastify.post<{ Params: { matchId: string }; Body: { content: string; step?: number } }>(
    '/api/matches/:matchId/comments',
    {
      schema: {
        tags: ['social'],
        summary: 'Add a comment to a match',
        params: toJsonSchema(z.object({ matchId: z.uuid() })),
        body: toJsonSchema(
          z.object({
            content: z.string().min(1).max(1000),
            step: z.number().int().min(0).optional(),
          }),
        ),
        response: {
          204: { type: 'null', description: 'Comment added successfully' },
          401: toJsonSchema(ErrorResponseSchema),
        },
      },
    },
    async (request, reply) => {
      const user = await getAuthUser(request);
      if (!user) return reply.status(401).send({ error: 'Unauthorized', code: 'UNAUTHORIZED' });

      return traceHttpHandler('social.comment', httpTraceContext(request, reply), async () => {
        await matchRepo.addComment({
          userId: user.id,
          matchId: request.params.matchId,
          content: request.body.content,
          step: request.body.step,
        });
        void reply.status(204);
        return null;
      });
    },
  );

  fastify.get<{ Params: { matchId: string } }>(
    '/api/matches/:matchId/comments',
    {
      schema: {
        tags: ['social'],
        summary: 'Get comments for a match',
        params: toJsonSchema(z.object({ matchId: z.uuid() })),
        response: {
          200: toJsonSchema(z.array(CommentSchema)),
        },
      },
    },
    async (request, reply) => {
      return traceHttpHandler('social.get_comments', httpTraceContext(request, reply), async () => {
        return await matchRepo.getMatchComments(request.params.matchId);
      });
    },
  );
}
