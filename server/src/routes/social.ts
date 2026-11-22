import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ErrorResponseSchema, SpectatorMatchSummarySchema } from '@phalanxduel/shared';
import { withRouteAspect } from '../http-aspect.js';
import { toJsonSchema } from '../utils/openapi.js';
import { UserRepository } from '../db/user-repo.js';
import { MatchRepository } from '../db/match-repo.js';
import { ContentFilterService } from '../content-filter.js';
import { ModerationService } from '../services/moderation-service.js';

export function registerSocialRoutes(fastify: FastifyInstance): void {
  const userRepo = new UserRepository();
  const matchRepo = new MatchRepository();
  const moderationService = new ModerationService();

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
    withRouteAspect<{ Params: { targetUserId: string } }, false, true>(
      { operation: 'social.follow', requireAuth: true, userRepo },
      async ({ request, reply, user }) => {
        const followerId = user.id;
        const followingId = request.params.targetUserId;

        if (followerId === followingId) {
          void reply.status(400);
          return { error: 'Cannot follow yourself', code: 'SELF_FOLLOW_PROHIBITED' };
        }

        await userRepo.followUser(followerId, followingId);
        void reply.status(204);
        return null;
      },
    ),
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
    withRouteAspect<{ Params: { targetUserId: string } }, false, true>(
      { operation: 'social.unfollow', requireAuth: true, userRepo },
      async ({ request, reply, user }) => {
        await userRepo.unfollowUser(user.id, request.params.targetUserId);
        void reply.status(204);
        return null;
      },
    ),
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
    withRouteAspect<{ Params: { userId: string } }>(
      { operation: 'social.follow_stats' },
      async ({ request }) => userRepo.getFollowStats(request.params.userId),
    ),
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
    withRouteAspect<{ Params: { matchId: string } }, false, true>(
      { operation: 'social.favorite', requireAuth: true, userRepo },
      async ({ request, reply, user }) => {
        await matchRepo.favoriteMatch(user.id, request.params.matchId);
        void reply.status(204);
        return null;
      },
    ),
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
    withRouteAspect<{ Params: { matchId: string } }, false, true>(
      { operation: 'social.unfavorite', requireAuth: true, userRepo },
      async ({ request, reply, user }) => {
        await matchRepo.unfavoriteMatch(user.id, request.params.matchId);
        void reply.status(204);
        return null;
      },
    ),
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
    withRouteAspect<{ Params: { userId: string } }>(
      { operation: 'social.list_favorites' },
      async ({ request }) => matchRepo.listUserFavorites(request.params.userId),
    ),
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
    withRouteAspect<{ Params: { matchId: string }; Body: { rating: number } }, false, true>(
      { operation: 'social.rate', requireAuth: true, userRepo },
      async ({ request, reply, user }) => {
        await matchRepo.rateMatch(user.id, request.params.matchId, request.body.rating);
        void reply.status(204);
        return null;
      },
    ),
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
    withRouteAspect<{ Params: { matchId: string } }>(
      { operation: 'social.match_stats' },
      async ({ request }) => matchRepo.getMatchSocialStats(request.params.matchId),
    ),
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
    withRouteAspect<
      { Params: { matchId: string }; Body: { content: string; step?: number } },
      false,
      true
    >(
      { operation: 'social.comment', requireAuth: true, userRepo },
      async ({ request, reply, user }) => {
        const { content, step } = request.body;

        // Automatic moderation
        const filter = ContentFilterService.getInstance();
        if (filter.isFlagged(content)) {
          await moderationService.handleViolation(user.id, content, 'comment');
          return reply.status(400).send({
            error: 'Comment contains inappropriate content and has been flagged for moderation.',
            code: 'CONTENT_FLAGGED',
          });
        }

        await matchRepo.addComment({
          userId: user.id,
          matchId: request.params.matchId,
          content,
          step,
        });
        void reply.status(204);
        return null;
      },
    ),
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
    withRouteAspect<{ Params: { matchId: string } }>(
      { operation: 'social.get_comments' },
      async ({ request }) => {
        const comments = await matchRepo.getMatchComments(request.params.matchId);
        return comments.filter((c) => !c.isRemoved);
      },
    ),
  );
}
