import type { FastifyInstance } from 'fastify';
import { MatchRepository } from '../db/match-repo.js';
import { traceHttpHandler, httpTraceContext } from '../tracing.js';
import { toJsonSchema } from '../utils/openapi.js';
import { z } from 'zod';
import { timingSafeEqual } from 'node:crypto';

function resolveAdminCredentials(): { user: string; password: string } | null {
  const configuredUser = process.env.PHALANX_ADMIN_USER;
  const configuredPassword = process.env.PHALANX_ADMIN_PASSWORD;
  if (configuredUser && configuredPassword) {
    return { user: configuredUser, password: configuredPassword };
  }

  const env = process.env.NODE_ENV ?? 'development';
  if (env === 'development' || env === 'test') {
    return { user: 'phalanx', password: 'phalanx' };
  }

  return null;
}

function checkBasicAuth(authHeader: string | undefined): boolean {
  if (!authHeader) return false;

  const match = /^Basic\s+(.+)$/i.exec(authHeader);
  if (!match) return false;

  let decoded: string;
  try {
    const credentials = match[1];
    if (!credentials) return false;
    decoded = Buffer.from(credentials, 'base64').toString('utf8');
  } catch {
    return false;
  }

  const colonIndex = decoded.indexOf(':');
  if (colonIndex === -1) return false;

  const user = decoded.slice(0, colonIndex);
  const password = decoded.slice(colonIndex + 1);

  const creds = resolveAdminCredentials();
  if (!creds) return false;
  const expectedUser = creds.user;
  const expectedPassword = creds.password;

  const MAX_LEN = 256;
  const userActual = Buffer.alloc(MAX_LEN);
  const userExpected = Buffer.alloc(MAX_LEN);
  userActual.write(user.slice(0, MAX_LEN), 'utf8');
  userExpected.write(expectedUser.slice(0, MAX_LEN), 'utf8');

  const passActual = Buffer.alloc(MAX_LEN);
  const passExpected = Buffer.alloc(MAX_LEN);
  passActual.write(password.slice(0, MAX_LEN), 'utf8');
  passExpected.write(expectedPassword.slice(0, MAX_LEN), 'utf8');

  return timingSafeEqual(userActual, userExpected) && timingSafeEqual(passActual, passExpected);
}

export function registerAdminRoutes(fastify: FastifyInstance) {
  const matchRepo = new MatchRepository();

  fastify.register(async (admin) => {
    admin.addHook('preHandler', async (request, reply) => {
      if (!checkBasicAuth(request.headers.authorization)) {
        void reply.status(401).header('WWW-Authenticate', 'Basic realm="Phalanx Duel Admin"');
        throw new Error('Unauthorized');
      }
    });

    admin.get<{ Querystring: { q: string } }>(
      '/api/admin/players/search',
      {
        schema: {
          tags: ['admin'],
          summary: 'Search players',
          querystring: toJsonSchema(z.object({ q: z.string().min(1) })),
          response: {
            200: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  gamertag: { type: 'string' },
                  suffix: { type: 'integer', nullable: true },
                  email: { type: 'string' },
                  elo: { type: 'integer' },
                  createdAt: { type: 'string' },
                  isAdmin: { type: 'boolean' },
                },
              },
            },
          },
        },
      },
      async (request, reply) => {
        return traceHttpHandler(
          'admin.player_search',
          httpTraceContext(request, reply),
          async () => {
            const { q } = request.query;
            return await matchRepo.adminSearchUsers(q);
          },
        );
      },
    );

    admin.get(
      '/api/admin/stats/deep',
      {
        schema: {
          tags: ['admin'],
          summary: 'Deep system statistics',
          response: {
            200: {
              type: 'object',
              properties: {
                totalUsers: { type: 'integer' },
                totalMatches: { type: 'integer' },
                suitDistribution: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      suit: { type: 'string', nullable: true },
                      count: { type: 'integer' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      async (request, reply) => {
        return traceHttpHandler('admin.deep_stats', httpTraceContext(request, reply), async () => {
          return await matchRepo.adminGetDeepStats();
        });
      },
    );

    admin.get<{ Querystring: { q: string } }>(
      '/api/admin/matches/search',
      {
        schema: {
          tags: ['admin'],
          summary: 'Search match summaries',
          querystring: toJsonSchema(z.object({ q: z.string().min(1) })),
          response: {
            200: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  matchId: { type: 'string' },
                  summary: { type: 'string' },
                  metadata: { type: 'object' },
                  createdAt: { type: 'string' },
                },
              },
            },
          },
        },
      },
      async (request, reply) => {
        return traceHttpHandler(
          'admin.match_search',
          httpTraceContext(request, reply),
          async () => {
            const { q } = request.query;
            return await matchRepo.adminSearchMatchSummaries(q);
          },
        );
      },
    );
  });
}
