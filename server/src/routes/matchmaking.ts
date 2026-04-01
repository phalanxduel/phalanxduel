import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ErrorResponseSchema } from '@phalanxduel/shared';
import type { MatchManager } from '../match.js';
import { MatchError } from '../match.js';
import { toJsonSchema } from '../utils/openapi.js';
import { traceHttpHandler, httpTraceContext } from '../tracing.js';

const JoinRequestSchema = z.object({
  playerName: z.string().trim().min(1).max(50),
  userId: z.uuid().optional(),
});

const JoinResponseSchema = z.object({
  matchId: z.uuid(),
  playerId: z.uuid(),
  playerIndex: z.number().int().min(0).max(1),
  role: z.enum(['P0', 'P1']),
});

const LobbyMatchSchema = z.object({
  matchId: z.uuid(),
  openSeat: z.enum(['P0', 'P1']),
  players: z.array(
    z.object({
      name: z.string(),
      connected: z.boolean(),
    }),
  ),
  phase: z.string().nullable(),
  turnNumber: z.number().int().nullable(),
  ageSeconds: z.number().int().min(0),
  lastActivitySeconds: z.number().int().min(0),
});

export function registerMatchmakingRoutes(
  fastify: FastifyInstance,
  matchManager: MatchManager,
): void {
  fastify.get(
    '/api/matches/lobby',
    {
      schema: {
        tags: ['matches'],
        summary: 'List publicly joinable matches',
        description:
          'Returns active matches with at least one open player seat. Private matches are not currently implemented, so all non-full matches are public.',
        response: {
          200: {
            description: 'Joinable match lobby entries',
            ...toJsonSchema(z.array(LobbyMatchSchema)),
          },
          500: toJsonSchema(ErrorResponseSchema),
        },
      },
    },
    async (request, reply) => {
      return traceHttpHandler('listLobbyMatches', httpTraceContext(request, reply), () => {
        const now = Date.now();
        return matchManager.listJoinableMatches().map((match) => ({
          matchId: match.matchId,
          openSeat: match.openSeat,
          players: match.players,
          phase: match.phase,
          turnNumber: match.turnNumber,
          ageSeconds: Math.floor((now - match.createdAt) / 1000),
          lastActivitySeconds: Math.floor((now - match.lastActivityAt) / 1000),
        }));
      });
    },
  );

  fastify.post<{ Params: { id: string }; Body: unknown }>(
    '/api/matches/:id/join',
    {
      schema: {
        tags: ['matches'],
        summary: 'Join a match without WebSocket bootstrap',
        description:
          'Allocates a player seat and returns the player secret needed for subsequent WebSocket rejoin or action authorization.',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
          required: ['id'],
        },
        body: toJsonSchema(JoinRequestSchema),
        response: {
          200: {
            description: 'Assigned player seat details',
            ...toJsonSchema(JoinResponseSchema),
          },
          400: toJsonSchema(ErrorResponseSchema),
          404: toJsonSchema(ErrorResponseSchema),
          409: toJsonSchema(ErrorResponseSchema),
        },
      },
    },
    async (request, reply) => {
      return traceHttpHandler('restJoinMatch', httpTraceContext(request, reply), async (span) => {
        const parsed = JoinRequestSchema.safeParse(request.body);
        if (!parsed.success) {
          void reply.status(400);
          return {
            error: 'Validation Error',
            code: 'VALIDATION_ERROR',
            details: parsed.error.issues,
          };
        }

        try {
          const { playerId, playerIndex } = await matchManager.joinMatch(
            request.params.id,
            parsed.data.playerName,
            null,
            parsed.data.userId,
          );
          span.setAttribute('match.id', request.params.id);
          span.setAttribute('player.index', playerIndex);

          return {
            matchId: request.params.id,
            playerId,
            playerIndex,
            role: playerIndex === 0 ? 'P0' : 'P1',
          };
        } catch (error) {
          if (error instanceof MatchError) {
            const statusCode =
              error.code === 'MATCH_NOT_FOUND' ? 404 : error.code === 'MATCH_FULL' ? 409 : 400;
            void reply.status(statusCode);
            return { error: error.message, code: error.code };
          }
          throw error;
        }
      });
    },
  );
}
