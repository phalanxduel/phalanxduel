import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ErrorResponseSchema, isGameOver } from '@phalanxduel/shared';
import { MatchRepository } from '../db/match-repo.js';
import type { IMatchManager, MatchInstance, SpectatorMatchSummary } from '../match-types.js';
import { toJsonSchema } from '../utils/openapi.js';
import { traceHttpHandler, httpTraceContext } from '../tracing.js';

const SpectatorStatusSchema = z.enum(['waiting', 'active', 'all']).default('all');

const SpectatorMatchSchema = z.object({
  matchId: z.uuid(),
  status: z.enum(['waiting', 'active']),
  phase: z.string().nullable(),
  turnNumber: z.number().int().nullable(),
  player1Name: z.string().nullable(),
  player2Name: z.string().nullable(),
  spectatorCount: z.number().int().min(0),
  isPvP: z.boolean(),
  humanPlayerCount: z.number().int().min(0),
  createdAt: z.string(),
  updatedAt: z.string(),
});

function toSpectatorSummary(match: MatchInstance): SpectatorMatchSummary | null {
  if (match.state != null && isGameOver(match.state)) return null;
  const playerCount = match.players.filter((player) => player !== null).length;
  if (playerCount === 0) return null;

  const isPvP = match.botPlayerIndex == null;
  const humanPlayerCount = isPvP ? playerCount : 1;

  if (playerCount === 1) {
    return {
      matchId: match.matchId,
      status: 'waiting',
      phase: null,
      turnNumber: null,
      player1Name: match.players[0]?.playerName ?? null,
      player2Name: match.players[1]?.playerName ?? null,
      spectatorCount: match.spectators.length,
      isPvP,
      humanPlayerCount,
      createdAt: new Date(match.createdAt).toISOString(),
      updatedAt: new Date(match.lastActivityAt).toISOString(),
    };
  }
  if (!match.state) return null;
  return {
    matchId: match.matchId,
    status: 'active',
    phase: match.state.phase,
    turnNumber: match.state.turnNumber,
    player1Name: match.players[0]?.playerName ?? null,
    player2Name: match.players[1]?.playerName ?? null,
    spectatorCount: match.spectators.length,
    isPvP,
    humanPlayerCount,
    createdAt: new Date(match.createdAt).toISOString(),
    updatedAt: new Date(match.lastActivityAt).toISOString(),
  };
}

function sortSpectatorMatches(left: SpectatorMatchSummary, right: SpectatorMatchSummary): number {
  if (left.status !== right.status) return left.status === 'active' ? -1 : 1;
  return Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
}

export function registerSpectatorRoutes(
  fastify: FastifyInstance,
  matchManager: IMatchManager,
  matchRepo = new MatchRepository(),
): void {
  fastify.get<{ Querystring: { status?: 'waiting' | 'active' | 'all' } }>(
    '/api/spectator/matches',
    {
      schema: {
        tags: ['spectator'],
        summary: 'List watchable matches',
        description:
          'Returns active in-progress matches and one-player waiting matches that can be watched once both players are seated.',
        querystring: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['waiting', 'active', 'all'], default: 'all' },
          },
        },
        response: {
          200: {
            description: 'Watchable match summaries',
            ...toJsonSchema(z.array(SpectatorMatchSchema)),
          },
          500: toJsonSchema(ErrorResponseSchema),
        },
      },
    },
    async (request, reply) => {
      return traceHttpHandler(
        'listSpectatorMatches',
        httpTraceContext(request, reply),
        async () => {
          const parsedStatus = SpectatorStatusSchema.parse(request.query.status ?? 'all');
          const byId = new Map<string, SpectatorMatchSummary>();

          for (const summary of await matchRepo.listSpectatorMatches()) {
            byId.set(summary.matchId, summary);
          }

          for (const match of matchManager.listInMemoryMatches()) {
            const summary = toSpectatorSummary(match);
            if (summary) byId.set(summary.matchId, summary);
          }

          return [...byId.values()]
            .filter((summary) => parsedStatus === 'all' || summary.status === parsedStatus)
            .sort(sortSpectatorMatches);
        },
      );
    },
  );
}
