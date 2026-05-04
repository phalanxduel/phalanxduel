import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ErrorResponseSchema, isGameOver } from '@phalanxduel/shared';
import type { IMatchManager } from '../match-types.js';
import type { LobbyMatchSummary } from '../match-types.js';
import { ActionError, MatchError } from '../match.js';
import { toJsonSchema } from '../utils/openapi.js';
import { traceHttpHandler, httpTraceContext } from '../tracing.js';
import { MatchRepository, type UserActiveMatchSummary } from '../db/match-repo.js';
import { PlayerRatingsService } from '../ratings.js';

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

const CreatorStatsSchema = z.object({
  eloRating: z.number().int(),
  glickoRating: z.number().int(),
  glickoRD: z.number().int(),
  wins: z.number().int(),
  losses: z.number().int(),
  abandons: z.number().int(),
  gamesPlayed: z.number().int(),
  matchesCreated: z.number().int(),
  successfulStarts: z.number().int(),
});

const LobbyMatchSchema = z.object({
  matchId: z.uuid(),
  openSeat: z.enum(['P0', 'P1']),
  visibility: z.enum(['private', 'public_open']),
  publicStatus: z.enum(['open', 'claimed', 'expired', 'cancelled']).nullable(),
  creatorUserId: z.uuid().nullable(),
  creatorName: z.string(),
  creatorElo: z.number().int().nullable(),
  creatorRecord: z
    .object({
      wins: z.number().int(),
      losses: z.number().int(),
      draws: z.number().int(),
      gamesPlayed: z.number().int(),
      provisional: z.boolean(),
      confidenceLabel: z.string(),
    })
    .nullable(),
  creatorStats: CreatorStatsSchema.nullable(),
  requirements: z
    .object({
      minPublicRating: z.number().int().nullable(),
      maxPublicRating: z.number().int().nullable(),
      minGamesPlayed: z.number().int().nullable(),
      requiresEstablishedRating: z.boolean(),
    })
    .nullable(),
  joinable: z.boolean(),
  disabledReason: z.string().nullable(),
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
  createdAt: z.iso.datetime(),
  expiresAt: z.iso.datetime().nullable(),
  expiryStatus: z.enum(['fresh', 'expiring', 'expired', 'recent_expired']),
});

const FRESHNESS_EXPIRING_MS = 15 * 60 * 1000;
const RECENT_EXPIRED_WINDOW_MS = 60 * 60 * 1000;

function deriveExpiryStatus(
  publicExpiresAtMs: number | null,
  now: number,
): 'fresh' | 'expiring' | 'expired' | 'recent_expired' {
  if (publicExpiresAtMs === null) return 'fresh';
  const remaining = publicExpiresAtMs - now;
  if (remaining > FRESHNESS_EXPIRING_MS) return 'fresh';
  if (remaining > 0) return 'expiring';
  if (now - publicExpiresAtMs <= RECENT_EXPIRED_WINDOW_MS) return 'recent_expired';
  return 'expired';
}

const ActiveMatchSchema = z.object({
  matchId: z.uuid(),
  playerId: z.uuid(),
  playerIndex: z.number().int().min(0).max(1),
  role: z.enum(['P0', 'P1']),
  opponentName: z.string().nullable(),
  botStrategy: z.enum(['random', 'heuristic']).nullable(),
  status: z.enum(['pending', 'active']),
  phase: z.string().nullable(),
  turnNumber: z.number().int().nullable(),
  disconnected: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

const AbandonMatchResponseSchema = z.object({
  ok: z.literal(true),
  status: z.enum(['forfeited']),
  matchId: z.uuid(),
});

type ActiveMatchResponse = z.infer<typeof ActiveMatchSchema>;

function resolveAuthenticatedUserId(
  fastify: FastifyInstance,
  request: { headers: Record<string, unknown>; cookies: Record<string, string | undefined> },
): string | null {
  try {
    const authHeader =
      typeof request.headers.authorization === 'string' ? request.headers.authorization : undefined;
    let token = authHeader?.replace('Bearer ', '');
    token ??= request.cookies.phalanx_refresh;
    if (!token) return null;
    return fastify.jwt.verify<{ id: string }>(token).id;
  } catch {
    return null;
  }
}

function toRuntimeAwareSummary(
  matchManager: IMatchManager,
  summary: UserActiveMatchSummary,
  userId: string,
): ActiveMatchResponse {
  const loaded = matchManager.getMatchSync(summary.matchId);
  const player = loaded?.players.find((candidate) => candidate?.userId === userId) ?? null;

  return {
    ...summary,
    role: summary.playerIndex === 0 ? ('P0' as const) : ('P1' as const),
    phase: loaded?.state?.phase ?? summary.phase,
    turnNumber: loaded?.state?.turnNumber ?? summary.turnNumber,
    disconnected: Boolean(player?.disconnectedAt),
    updatedAt: loaded ? new Date(loaded.lastActivityAt).toISOString() : summary.updatedAt,
  };
}

function collectInMemoryActiveMatches(matchManager: IMatchManager, userId: string) {
  return matchManager
    .listInMemoryMatches()
    .map((match): ActiveMatchResponse | null => {
      const player = match.players.find((candidate) => candidate?.userId === userId);
      if (!player) return null;
      if (match.state != null && isGameOver(match.state)) return null;
      const opponent = match.players.find(
        (candidate) => candidate && candidate.playerId !== player.playerId,
      );
      return {
        matchId: match.matchId,
        playerId: player.playerId,
        playerIndex: player.playerIndex,
        role: player.playerIndex === 0 ? ('P0' as const) : ('P1' as const),
        opponentName: opponent?.playerName ?? null,
        botStrategy: match.botStrategy ?? null,
        status: match.state ? ('active' as const) : ('pending' as const),
        phase: match.state?.phase ?? null,
        turnNumber: match.state?.turnNumber ?? null,
        disconnected: Boolean(player.disconnectedAt),
        createdAt: new Date(match.createdAt).toISOString(),
        updatedAt: new Date(match.lastActivityAt).toISOString(),
      };
    })
    .filter((match): match is ActiveMatchResponse => Boolean(match));
}

function resolveLobbyJoinability(args: {
  match: LobbyMatchSummary;
  userId: string | null;
  viewerProfile: {
    elo: number;
    confidenceLabel: string;
    record: { gamesPlayed: number; wins: number; losses: number; draws: number };
  } | null;
}): { canJoin: boolean; disabledReason: string | null } {
  const { match, userId, viewerProfile } = args;
  const requirements = match.requirements;

  if (match.publicStatus !== 'open') {
    return { canJoin: false, disabledReason: 'MATCH_NOT_OPEN' };
  }
  if (userId && userId === match.creatorUserId) {
    return { canJoin: false, disabledReason: 'CREATOR_CANNOT_JOIN' };
  }
  if (!requirements) {
    return { canJoin: true, disabledReason: null };
  }
  if (!viewerProfile) {
    const canJoin =
      !requirements.requiresEstablishedRating &&
      requirements.minPublicRating === null &&
      requirements.maxPublicRating === null &&
      requirements.minGamesPlayed === null;
    return {
      canJoin,
      disabledReason: canJoin
        ? null
        : requirements.requiresEstablishedRating
          ? 'AUTH_REQUIRED'
          : 'MATCH_UNAVAILABLE',
    };
  }
  if (requirements.requiresEstablishedRating && viewerProfile.confidenceLabel !== 'Established') {
    return { canJoin: false, disabledReason: 'RATING_NOT_ESTABLISHED' };
  }
  if (requirements.minPublicRating !== null && viewerProfile.elo < requirements.minPublicRating) {
    return { canJoin: false, disabledReason: 'RATING_TOO_LOW' };
  }
  if (requirements.maxPublicRating !== null && viewerProfile.elo > requirements.maxPublicRating) {
    return { canJoin: false, disabledReason: 'RATING_TOO_HIGH' };
  }
  if (
    requirements.minGamesPlayed !== null &&
    viewerProfile.record.gamesPlayed < requirements.minGamesPlayed
  ) {
    return { canJoin: false, disabledReason: 'MIN_GAMES_NOT_MET' };
  }
  return { canJoin: true, disabledReason: null };
}

function toLobbyMatchResponse(args: {
  match: LobbyMatchSummary;
  now: number;
  creatorProfile: {
    displayName: string;
    elo: number;
    record: { wins: number; losses: number; draws: number };
    confidenceLabel: string;
  } | null;
  creatorStats: z.infer<typeof CreatorStatsSchema> | null;
  joinability: { canJoin: boolean; disabledReason: string | null };
}): z.infer<typeof LobbyMatchSchema> {
  const { match, now, creatorProfile, creatorStats, joinability } = args;
  const requirements = match.requirements;
  return {
    matchId: match.matchId,
    openSeat: match.openSeat,
    visibility: match.visibility,
    publicStatus: match.publicStatus,
    creatorUserId: match.creatorUserId,
    creatorName: creatorProfile?.displayName ?? match.creatorName,
    creatorElo: creatorProfile?.elo ?? match.creatorElo,
    creatorRecord: creatorProfile
      ? {
          wins: creatorProfile.record.wins,
          losses: creatorProfile.record.losses,
          draws: creatorProfile.record.draws,
          gamesPlayed:
            creatorProfile.record.wins + creatorProfile.record.losses + creatorProfile.record.draws,
          provisional: creatorProfile.confidenceLabel === 'Provisional',
          confidenceLabel: creatorProfile.confidenceLabel,
        }
      : match.creatorRecord,
    creatorStats,
    requirements: requirements
      ? {
          minPublicRating: requirements.minPublicRating,
          maxPublicRating: requirements.maxPublicRating,
          minGamesPlayed: requirements.minGamesPlayed,
          requiresEstablishedRating: requirements.requiresEstablishedRating,
        }
      : null,
    joinable: joinability.canJoin,
    disabledReason: joinability.disabledReason,
    players: match.players,
    phase: match.phase,
    turnNumber: match.turnNumber,
    ageSeconds: Math.floor((now - match.createdAt) / 1000),
    lastActivitySeconds: Math.floor((now - match.lastActivityAt) / 1000),
    createdAt: new Date(match.createdAt).toISOString(),
    expiresAt: match.publicExpiresAt ? new Date(match.publicExpiresAt).toISOString() : null,
    expiryStatus: deriveExpiryStatus(match.publicExpiresAt, now),
  };
}

export function registerMatchmakingRoutes(
  fastify: FastifyInstance,
  matchManager: IMatchManager,
): void {
  const matchRepo = new MatchRepository();
  const profileService = new PlayerRatingsService();

  fastify.get<{ Querystring: { includeRecentlyExpired?: string } }>(
    '/api/matches/lobby',
    {
      schema: {
        tags: ['matches'],
        summary: 'List publicly joinable matches',
        description:
          'Returns public-open matches with at least one open player seat. Set includeRecentlyExpired=true to also append matches that expired within the last 60 minutes.',
        querystring: {
          type: 'object',
          properties: {
            includeRecentlyExpired: { type: 'string', enum: ['true', 'false'] },
          },
        },
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
      return traceHttpHandler('listLobbyMatches', httpTraceContext(request, reply), async () => {
        const now = Date.now();
        const userId = resolveAuthenticatedUserId(fastify, request);
        const includeRecentlyExpired = request.query.includeRecentlyExpired === 'true';
        const viewerProfile = userId
          ? profileService.getPublicProfile(userId)
          : Promise.resolve(null);

        const openEntries = await Promise.all(
          matchManager.listJoinableMatches().map(async (match) => {
            const [resolvedViewerProfile, creatorProfile, creatorStats] = await Promise.all([
              viewerProfile,
              match.creatorUserId
                ? profileService.getPublicProfile(match.creatorUserId)
                : Promise.resolve(null),
              match.creatorUserId
                ? profileService.getCreatorStats(match.creatorUserId)
                : Promise.resolve(null),
            ]);
            const joinability = resolveLobbyJoinability({
              match,
              userId,
              viewerProfile: resolvedViewerProfile,
            });
            return toLobbyMatchResponse({
              match,
              now,
              creatorProfile,
              creatorStats,
              joinability,
            });
          }),
        );

        openEntries.sort((a, b) => a.ageSeconds - b.ageSeconds);

        if (!includeRecentlyExpired) return openEntries;

        const expiredRows = await matchRepo.listRecentlyExpiredPublicMatches();
        const expiredEntries = await Promise.all(
          expiredRows.map(async (row) => {
            const creatorProfile = row.creatorUserId
              ? await profileService.getPublicProfile(row.creatorUserId)
              : null;
            const creatorStats = row.creatorUserId
              ? await profileService.getCreatorStats(row.creatorUserId)
              : null;
            const summary: LobbyMatchSummary = {
              matchId: row.matchId,
              openSeat: 'P1',
              visibility: 'public_open',
              publicStatus: 'expired',
              creatorUserId: row.creatorUserId,
              creatorName: row.creatorName ?? 'Unknown',
              creatorElo: null,
              creatorRecord: null,
              requirements: {
                minPublicRating: row.minPublicRating,
                maxPublicRating: row.maxPublicRating,
                minGamesPlayed: row.minGamesPlayed,
                requiresEstablishedRating: row.requiresEstablishedRating,
              },
              joinable: false,
              disabledReason: 'MATCH_EXPIRED',
              players: [],
              phase: null,
              turnNumber: null,
              createdAt: row.createdAt.getTime(),
              lastActivityAt: row.publicExpiresAt?.getTime() ?? row.createdAt.getTime(),
              publicExpiresAt: row.publicExpiresAt?.getTime() ?? null,
            };
            return toLobbyMatchResponse({
              match: summary,
              now,
              creatorProfile,
              creatorStats,
              joinability: { canJoin: false, disabledReason: 'MATCH_EXPIRED' },
            });
          }),
        );

        return [...openEntries, ...expiredEntries];
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

  fastify.get(
    '/api/matches/active',
    {
      schema: {
        tags: ['matches'],
        summary: 'List authenticated active or pending matches',
        description:
          'Returns unfinished matches owned by the authenticated player so the client can resume or explicitly abandon them from the lobby.',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        response: {
          200: toJsonSchema(z.array(ActiveMatchSchema)),
          401: toJsonSchema(ErrorResponseSchema),
        },
      },
    },
    async (request, reply) => {
      return traceHttpHandler('listActiveMatches', httpTraceContext(request, reply), async () => {
        const userId = resolveAuthenticatedUserId(fastify, request);
        if (!userId) {
          void reply.status(401);
          return { error: 'Unauthorized', code: 'UNAUTHORIZED' };
        }

        const persisted = await matchRepo.listActiveMatchesForUser(userId);
        const merged = new Map<string, ActiveMatchResponse>();

        for (const summary of persisted) {
          merged.set(summary.matchId, toRuntimeAwareSummary(matchManager, summary, userId));
        }

        for (const summary of collectInMemoryActiveMatches(matchManager, userId)) {
          if (!merged.has(summary.matchId)) {
            merged.set(summary.matchId, summary);
          }
        }

        return Array.from(merged.values()).sort((left, right) =>
          right.updatedAt.localeCompare(left.updatedAt),
        );
      });
    },
  );

  fastify.post<{ Params: { id: string } }>(
    '/api/matches/:id/abandon',
    {
      schema: {
        tags: ['matches'],
        summary: 'Forfeit an authenticated active match',
        description:
          'Lets the authenticated player abandon an unfinished match from the lobby. Abandoning is implemented as a forfeit and reuses the authoritative gameplay action path.',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
          required: ['id'],
        },
        response: {
          200: toJsonSchema(AbandonMatchResponseSchema),
          401: toJsonSchema(ErrorResponseSchema),
          404: toJsonSchema(ErrorResponseSchema),
          409: toJsonSchema(ErrorResponseSchema),
        },
      },
    },
    async (request, reply) => {
      return traceHttpHandler('abandonMatch', httpTraceContext(request, reply), async () => {
        const userId = resolveAuthenticatedUserId(fastify, request);
        if (!userId) {
          void reply.status(401);
          return { error: 'Unauthorized', code: 'UNAUTHORIZED' };
        }

        const match = await matchManager.getMatch(request.params.id);
        if (!match) {
          void reply.status(404);
          return { error: 'Match not found', code: 'MATCH_NOT_FOUND' };
        }

        const player = match.players.find((candidate) => candidate?.userId === userId);
        if (!player) {
          void reply.status(404);
          return { error: 'Match not found', code: 'MATCH_NOT_FOUND' };
        }

        if (match.state != null && isGameOver(match.state)) {
          void reply.status(409);
          return { error: 'Match is not abandonable', code: 'MATCH_NOT_ABANDONABLE' };
        }

        if (!match.state) {
          const cancelled = await matchManager.cancelMatch(request.params.id, userId);
          if (!cancelled) {
            void reply.status(409);
            return { error: 'Match is not abandonable', code: 'MATCH_NOT_ABANDONABLE' };
          }
          return {
            ok: true as const,
            status: 'forfeited' as const,
            matchId: request.params.id,
          };
        }

        try {
          await matchManager.handleAction(request.params.id, player.playerId, {
            type: 'forfeit',
            playerIndex: player.playerIndex,
            timestamp: new Date().toISOString(),
          });
          return {
            ok: true as const,
            status: 'forfeited' as const,
            matchId: request.params.id,
          };
        } catch (error) {
          if (error instanceof MatchError) {
            void reply.status(error.code === 'MATCH_NOT_FOUND' ? 404 : 409);
            return { error: error.message, code: error.code };
          }
          if (error instanceof ActionError) {
            void reply.status(409);
            return { error: error.message, code: error.code };
          }
          throw error;
        }
      });
    },
  );
}
