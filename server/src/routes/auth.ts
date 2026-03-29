import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq, sql } from 'drizzle-orm';
import { validateGamertagFull, assignGamertagSuffix } from '../gamertag.js';
import { normalizeGamertag } from '@phalanxduel/shared';
import { traceDbQuery, traceDbTransaction } from '../db/observability.js';
import { httpTraceContext, traceHttpHandler } from '../tracing.js';

const RegisterSchema = z.object({
  gamertag: z.string().min(3).max(20),
  email: z.email(),
  password: z.string().min(8),
});

const LoginSchema = z.object({
  email: z.email(),
  password: z.string(),
});

const ChangeGamertagSchema = z.object({
  gamertag: z.string().min(3).max(20),
});

async function assignSuffixInTransaction(
  tx: Parameters<Parameters<NonNullable<typeof db>['transaction']>[0]>[0],
  normalized: string,
) {
  const [info] = await traceDbQuery(
    'db.users.select_suffix_window',
    {
      attributes: {
        'gamertag.normalized': normalized,
      },
      operation: 'SELECT',
      table: 'users',
    },
    () =>
      tx
        .select({
          maxSuffix: sql<number | null>`MAX(${users.suffix})`,
          count: sql<number>`COUNT(*)::int`,
        })
        .from(users)
        .where(eq(users.gamertagNormalized, normalized)),
  );

  const existingInfo =
    info && info.count > 0 ? { maxSuffix: info.maxSuffix, count: info.count } : null;
  const { newSuffix, updateExisting } = assignGamertagSuffix(existingInfo);

  if (updateExisting !== null) {
    await traceDbQuery(
      'db.users.update_suffix',
      {
        attributes: {
          'gamertag.normalized': normalized,
        },
        operation: 'UPDATE',
        table: 'users',
      },
      () =>
        tx
          .update(users)
          .set({ suffix: updateExisting })
          .where(eq(users.gamertagNormalized, normalized)),
    );
  }

  return newSuffix;
}

export function registerAuthRoutes(fastify: FastifyInstance) {
  const UserSchema = {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      gamertag: { type: 'string' },
      suffix: { type: 'integer', minimum: 1, maximum: 9999 },
      email: { type: 'string', format: 'email' },
      elo: { type: 'integer' },
    },
  };

  const AuthResponseSchema = {
    type: 'object',
    properties: {
      token: { type: 'string' },
      user: UserSchema,
    },
  };

  const ErrorSchema = {
    type: 'object',
    properties: {
      error: { type: 'string' },
      details: { type: 'object', additionalProperties: true },
    },
  };

  fastify.post(
    '/api/auth/register',
    {
      schema: {
        tags: ['auth'],
        summary: 'Register a new user',
        body: {
          type: 'object',
          required: ['gamertag', 'email', 'password'],
          properties: {
            gamertag: { type: 'string', minLength: 3, maxLength: 20 },
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8 },
          },
        },
        response: {
          200: AuthResponseSchema,
          400: ErrorSchema,
          409: ErrorSchema,
          503: ErrorSchema,
        },
      },
    },
    async (request, reply) => {
      return traceHttpHandler('auth.register', httpTraceContext(request, reply), async () => {
        const database = db;
        if (!database) return reply.status(503).send({ error: 'Database not available' });

        const result = RegisterSchema.safeParse(request.body);
        if (!result.success) {
          return reply
            .status(400)
            .send({ error: 'Invalid input', details: z.formatError(result.error) });
        }

        const { gamertag, email, password } = result.data;

        const validationError = validateGamertagFull(gamertag);
        if (validationError) {
          return reply.status(400).send({ error: validationError });
        }

        const normalized = normalizeGamertag(gamertag);

        const existingEmail = await traceDbQuery(
          'db.users.select_by_email',
          {
            operation: 'SELECT',
            table: 'users',
          },
          () => database.select().from(users).where(eq(users.email, email)).limit(1),
        );
        if (existingEmail.length > 0) {
          return reply.status(409).send({ error: 'Email already registered' });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const user = await traceDbTransaction('db.users.register_transaction', () =>
          database.transaction(async (tx) => {
            const suffix = await assignSuffixInTransaction(tx, normalized);

            const [inserted] = await traceDbQuery(
              'db.users.insert',
              {
                operation: 'INSERT',
                table: 'users',
              },
              () =>
                tx
                  .insert(users)
                  .values({
                    gamertag,
                    gamertagNormalized: normalized,
                    suffix,
                    email,
                    passwordHash,
                  })
                  .returning({
                    id: users.id,
                    gamertag: users.gamertag,
                    suffix: users.suffix,
                    email: users.email,
                    elo: users.elo,
                  }),
            );

            if (!inserted) throw new Error('User insert returned no rows');
            return inserted;
          }),
        );

        const token = fastify.jwt.sign({
          id: user.id,
          gamertag: user.gamertag,
          suffix: user.suffix,
        });
        reply.setCookie('phalanx_refresh', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          path: '/',
          maxAge: 7 * 24 * 60 * 60,
        });
        return { token, user };
      });
    },
  );

  fastify.post(
    '/api/auth/login',
    {
      schema: {
        tags: ['auth'],
        summary: 'Login with email and password',
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string' },
          },
        },
        response: {
          200: AuthResponseSchema,
          400: ErrorSchema,
          401: ErrorSchema,
          503: ErrorSchema,
        },
      },
    },
    async (request, reply) => {
      return traceHttpHandler('auth.login', httpTraceContext(request, reply), async () => {
        const database = db;
        if (!database) return reply.status(503).send({ error: 'Database not available' });

        const result = LoginSchema.safeParse(request.body);
        if (!result.success) {
          return reply.status(400).send({ error: 'Invalid input' });
        }

        const { email, password } = result.data;

        const [user] = await traceDbQuery(
          'db.users.select_by_email',
          {
            operation: 'SELECT',
            table: 'users',
          },
          () => database.select().from(users).where(eq(users.email, email)).limit(1),
        );
        if (!user) {
          return reply.status(401).send({ error: 'Invalid credentials' });
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          return reply.status(401).send({ error: 'Invalid credentials' });
        }

        const token = fastify.jwt.sign({
          id: user.id,
          gamertag: user.gamertag,
          suffix: user.suffix,
        });
        reply.setCookie('phalanx_refresh', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          path: '/',
          maxAge: 7 * 24 * 60 * 60,
        });
        return {
          token,
          user: {
            id: user.id,
            gamertag: user.gamertag,
            suffix: user.suffix,
            email: user.email,
            elo: user.elo,
          },
        };
      });
    },
  );

  fastify.get(
    '/api/auth/me',
    {
      schema: {
        tags: ['auth'],
        summary: 'Get current user information',
        description: 'Returns the authenticated user object and a fresh token.',
        response: {
          200: AuthResponseSchema,
          401: ErrorSchema,
          404: ErrorSchema,
          503: ErrorSchema,
        },
      },
    },
    async (request, reply) => {
      return traceHttpHandler('auth.me', httpTraceContext(request, reply), async () => {
        try {
          let token = request.headers.authorization?.replace('Bearer ', '');
          if (!token) {
            token = request.cookies.phalanx_refresh;
          }
          if (!token) {
            return reply.status(401).send({ error: 'Unauthorized' });
          }

          const payload = fastify.jwt.verify<{ id: string }>(token);

          const database = db;
          if (!database) return reply.status(503).send({ error: 'Database not available' });

          const [user] = await traceDbQuery(
            'db.users.select_by_id',
            {
              operation: 'SELECT',
              table: 'users',
            },
            () => database.select().from(users).where(eq(users.id, payload.id)).limit(1),
          );
          if (!user) return reply.status(404).send({ error: 'User not found' });

          const freshToken = fastify.jwt.sign({
            id: user.id,
            gamertag: user.gamertag,
            suffix: user.suffix,
          });

          return {
            token: freshToken,
            user: {
              id: user.id,
              gamertag: user.gamertag,
              suffix: user.suffix,
              email: user.email,
              elo: user.elo,
            },
          };
        } catch {
          return reply.status(401).send({ error: 'Unauthorized' });
        }
      });
    },
  );

  fastify.post(
    '/api/auth/gamertag',
    {
      schema: {
        tags: ['auth'],
        summary: 'Change gamertag',
        description:
          'Updates the authenticated user gamertag and assigns a new suffix. Limited to once every 7 days.',
        body: {
          type: 'object',
          required: ['gamertag'],
          properties: {
            gamertag: { type: 'string', minLength: 3, maxLength: 20 },
          },
        },
        response: {
          200: AuthResponseSchema,
          400: ErrorSchema,
          401: ErrorSchema,
          404: ErrorSchema,
          429: ErrorSchema,
          503: ErrorSchema,
        },
      },
    },
    async (request, reply) => {
      return traceHttpHandler('auth.gamertag', httpTraceContext(request, reply), async () => {
        try {
          let token = request.headers.authorization?.replace('Bearer ', '');
          if (!token) {
            token = request.cookies.phalanx_refresh;
          }
          if (!token) {
            return reply.status(401).send({ error: 'Unauthorized' });
          }

          const payload = fastify.jwt.verify<{ id: string }>(token);

          const database = db;
          if (!database) return reply.status(503).send({ error: 'Database not available' });

          const result = ChangeGamertagSchema.safeParse(request.body);
          if (!result.success) {
            return reply.status(400).send({
              error: 'Invalid input',
              details: z.formatError(result.error),
            });
          }

          const { gamertag } = result.data;

          const validationError = validateGamertagFull(gamertag);
          if (validationError) {
            return reply.status(400).send({ error: validationError });
          }

          const normalized = normalizeGamertag(gamertag);

          const [currentUser] = await traceDbQuery(
            'db.users.select_by_id',
            {
              operation: 'SELECT',
              table: 'users',
            },
            () => database.select().from(users).where(eq(users.id, payload.id)).limit(1),
          );
          if (!currentUser) {
            return reply.status(404).send({ error: 'User not found' });
          }

          if (currentUser.gamertagChangedAt) {
            const cooldownMs = 7 * 24 * 60 * 60 * 1000;
            const elapsed = Date.now() - currentUser.gamertagChangedAt.getTime();
            if (elapsed < cooldownMs) {
              const remainingDays = Math.ceil((cooldownMs - elapsed) / (24 * 60 * 60 * 1000));
              return reply.status(429).send({
                error: `Gamertag can only be changed every 7 days. Try again in ${remainingDays} day(s).`,
              });
            }
          }

          const user = await traceDbTransaction('db.users.change_gamertag_transaction', () =>
            database.transaction(async (tx) => {
              const suffix = await assignSuffixInTransaction(tx, normalized);

              const [updated] = await traceDbQuery(
                'db.users.update_gamertag',
                {
                  operation: 'UPDATE',
                  table: 'users',
                },
                () =>
                  tx
                    .update(users)
                    .set({
                      gamertag,
                      gamertagNormalized: normalized,
                      suffix,
                      gamertagChangedAt: new Date(),
                      updatedAt: new Date(),
                    })
                    .where(eq(users.id, payload.id))
                    .returning({
                      id: users.id,
                      gamertag: users.gamertag,
                      suffix: users.suffix,
                      email: users.email,
                      elo: users.elo,
                    }),
              );

              if (!updated) throw new Error('User update returned no rows');
              return updated;
            }),
          );

          const freshToken = fastify.jwt.sign({
            id: user.id,
            gamertag: user.gamertag,
            suffix: user.suffix,
          });
          reply.setCookie('phalanx_refresh', freshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 7 * 24 * 60 * 60,
          });

          return { token: freshToken, user };
        } catch {
          return reply.status(401).send({ error: 'Unauthorized' });
        }
      });
    },
  );

  const AVATAR_ICONS = [
    'sword',
    'shield',
    'crown',
    'dragon',
    'skull',
    'flame',
    'star',
    'bolt',
    'gem',
    'heart',
  ] as const;

  const ProfileUpdateSchema = z.object({
    favoriteSuit: z.enum(['spades', 'hearts', 'diamonds', 'clubs']).optional(),
    tagline: z.string().max(140).optional(),
    avatarIcon: z.enum(AVATAR_ICONS).optional(),
  });

  fastify.post(
    '/api/auth/profile',
    {
      schema: {
        tags: ['auth'],
        summary: 'Update user profile',
        description: 'Updates profile metadata such as favorite suit, tagline, and avatar icon.',
        body: {
          type: 'object',
          properties: {
            favoriteSuit: { type: 'string', enum: ['spades', 'hearts', 'diamonds', 'clubs'] },
            tagline: { type: 'string', maxLength: 140 },
            avatarIcon: { type: 'string', enum: AVATAR_ICONS },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              user: {
                ...UserSchema,
                properties: {
                  ...UserSchema.properties,
                  favoriteSuit: {
                    type: 'string',
                    enum: ['spades', 'hearts', 'diamonds', 'clubs'],
                    nullable: true,
                  },
                  tagline: { type: 'string', nullable: true },
                  avatarIcon: { type: 'string', enum: AVATAR_ICONS, nullable: true },
                },
              },
            },
          },
          400: ErrorSchema,
          401: ErrorSchema,
          404: ErrorSchema,
          503: ErrorSchema,
        },
      },
    },
    async (request, reply) => {
      return traceHttpHandler('auth.profile', httpTraceContext(request, reply), async () => {
        const database = db;
        if (!database) return reply.status(503).send({ error: 'Database not available' });

        let token = request.headers.authorization?.replace('Bearer ', '');
        if (!token) token = request.cookies.phalanx_refresh;
        if (!token) return reply.status(401).send({ error: 'Unauthorized' });

        let payload: { id: string };
        try {
          payload = fastify.jwt.verify<{ id: string }>(token);
        } catch {
          return reply.status(401).send({ error: 'Unauthorized' });
        }

        const result = ProfileUpdateSchema.safeParse(request.body);
        if (!result.success) {
          return reply
            .status(400)
            .send({ error: 'Invalid input', details: z.formatError(result.error) });
        }

        const updates: Record<string, unknown> = { updatedAt: new Date() };
        if (result.data.favoriteSuit !== undefined) {
          updates.favoriteSuit = result.data.favoriteSuit;
        }
        if (result.data.tagline !== undefined) updates.tagline = result.data.tagline;
        if (result.data.avatarIcon !== undefined) updates.avatarIcon = result.data.avatarIcon;

        const [updated] = await traceDbQuery(
          'db.users.update_profile',
          {
            operation: 'UPDATE',
            table: 'users',
          },
          () =>
            database.update(users).set(updates).where(eq(users.id, payload.id)).returning({
              id: users.id,
              gamertag: users.gamertag,
              suffix: users.suffix,
              email: users.email,
              elo: users.elo,
              favoriteSuit: users.favoriteSuit,
              tagline: users.tagline,
              avatarIcon: users.avatarIcon,
            }),
        );

        if (!updated) return reply.status(404).send({ error: 'User not found' });
        return { user: updated };
      });
    },
  );

  fastify.post(
    '/api/auth/logout',
    {
      schema: {
        tags: ['auth'],
        summary: 'Logout',
        description: 'Clears the authentication cookies.',
        response: {
          200: {
            type: 'object',
            properties: {
              ok: { type: 'boolean' },
            },
          },
        },
      },
    },
    async (_request, reply) => {
      reply.clearCookie('phalanx_refresh', { path: '/' });
      return { ok: true };
    },
  );
}
