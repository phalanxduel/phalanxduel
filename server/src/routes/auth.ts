import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { db } from '../db/index.js';
import { users, passwordResetTokens } from '../db/schema.js';
import { eq, sql } from 'drizzle-orm';
import { validateGamertagFull, assignGamertagSuffix } from '../gamertag.js';
import { normalizeGamertag, ErrorResponseSchema } from '@phalanxduel/shared';
import { traceDbQuery, traceDbTransaction } from '../db/observability.js';
import { httpTraceContext, traceHttpHandler } from '../tracing.js';
import { toJsonSchema } from '../utils/openapi.js';
import { sendPasswordResetEmail } from '../utils/mailer.js';

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
  const UserSchema = z.object({
    id: z.uuid(),
    gamertag: z.string(),
    suffix: z.number().int().min(1).max(9999),
    email: z.email(),
    elo: z.number().int(),
  });

  const AuthResponseSchema = z.object({
    token: z.string(),
    user: UserSchema,
  });

  fastify.post(
    '/api/auth/register',
    {
      schema: {
        tags: ['auth'],
        summary: 'Register a new user',
        body: toJsonSchema(RegisterSchema),
        response: {
          200: toJsonSchema(AuthResponseSchema),
          400: toJsonSchema(ErrorResponseSchema),
          409: toJsonSchema(ErrorResponseSchema),
          503: toJsonSchema(ErrorResponseSchema),
        },
      },
    },
    async (request, reply) => {
      return await traceHttpHandler('auth.register', httpTraceContext(request, reply), async () => {
        const database = db;
        if (!database)
          return await reply
            .status(503)
            .send({ error: 'Database not available', code: 'DATABASE_UNAVAILABLE' });

        const result = RegisterSchema.safeParse(request.body);
        if (!result.success) {
          return reply.status(400).send({
            error: 'Invalid input',
            code: 'INVALID_INPUT',
            details: z.formatError(result.error),
          });
        }

        const { gamertag, email, password } = result.data;

        const validationError = validateGamertagFull(gamertag);
        if (validationError) {
          return await reply.status(400).send({ error: validationError, code: 'INVALID_GAMERTAG' });
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
          return await reply
            .status(409)
            .send({ error: 'Email already registered', code: 'EMAIL_ALREADY_REGISTERED' });
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
        body: toJsonSchema(LoginSchema),
        response: {
          200: toJsonSchema(AuthResponseSchema),
          400: toJsonSchema(ErrorResponseSchema),
          401: toJsonSchema(ErrorResponseSchema),
          503: toJsonSchema(ErrorResponseSchema),
        },
      },
    },
    async (request, reply) => {
      return await traceHttpHandler('auth.login', httpTraceContext(request, reply), async () => {
        const database = db;
        if (!database)
          return await reply
            .status(503)
            .send({ error: 'Database not available', code: 'DATABASE_UNAVAILABLE' });

        const result = LoginSchema.safeParse(request.body);
        if (!result.success) {
          return await reply.status(400).send({ error: 'Invalid input', code: 'INVALID_INPUT' });
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
          return await reply
            .status(401)
            .send({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          return await reply
            .status(401)
            .send({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
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
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        response: {
          200: toJsonSchema(AuthResponseSchema),
          401: toJsonSchema(ErrorResponseSchema),
          404: toJsonSchema(ErrorResponseSchema),
          503: toJsonSchema(ErrorResponseSchema),
        },
      },
    },
    async (request, reply) => {
      return await traceHttpHandler('auth.me', httpTraceContext(request, reply), async () => {
        try {
          let token = request.headers.authorization?.replace('Bearer ', '');
          token ??= request.cookies.phalanx_refresh;
          if (!token) {
            return await reply.status(401).send({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
          }

          const payload = fastify.jwt.verify<{ id: string }>(token);

          const database = db;
          if (!database)
            return await reply
              .status(503)
              .send({ error: 'Database not available', code: 'DATABASE_UNAVAILABLE' });

          const [user] = await traceDbQuery(
            'db.users.select_by_id',
            {
              operation: 'SELECT',
              table: 'users',
            },
            () => database.select().from(users).where(eq(users.id, payload.id)).limit(1),
          );
          if (!user)
            return await reply
              .status(404)
              .send({ error: 'User not found', code: 'USER_NOT_FOUND' });

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
          return await reply.status(401).send({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
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
        security: [{ bearerAuth: [] }],
        body: toJsonSchema(ChangeGamertagSchema),
        response: {
          200: toJsonSchema(AuthResponseSchema),
          400: toJsonSchema(ErrorResponseSchema),
          401: toJsonSchema(ErrorResponseSchema),
          404: toJsonSchema(ErrorResponseSchema),
          429: toJsonSchema(ErrorResponseSchema),
          503: toJsonSchema(ErrorResponseSchema),
        },
      },
    },
    async (request, reply) => {
      return await traceHttpHandler('auth.gamertag', httpTraceContext(request, reply), async () => {
        try {
          let token = request.headers.authorization?.replace('Bearer ', '');
          token ??= request.cookies.phalanx_refresh;
          if (!token) {
            return await reply.status(401).send({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
          }

          const payload = fastify.jwt.verify<{ id: string }>(token);

          const database = db;
          if (!database)
            return await reply
              .status(503)
              .send({ error: 'Database not available', code: 'DATABASE_UNAVAILABLE' });

          const result = ChangeGamertagSchema.safeParse(request.body);
          if (!result.success) {
            return await reply.status(400).send({
              error: 'Invalid input',
              code: 'INVALID_INPUT',
              details: z.formatError(result.error),
            });
          }

          const { gamertag } = result.data;

          const validationError = validateGamertagFull(gamertag);
          if (validationError) {
            return await reply
              .status(400)
              .send({ error: validationError, code: 'INVALID_GAMERTAG' });
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
            return await reply
              .status(404)
              .send({ error: 'User not found', code: 'USER_NOT_FOUND' });
          }

          if (currentUser.gamertagChangedAt) {
            const cooldownMs = 7 * 24 * 60 * 60 * 1000;
            const elapsed = Date.now() - currentUser.gamertagChangedAt.getTime();
            if (elapsed < cooldownMs) {
              const remainingDays = Math.ceil((cooldownMs - elapsed) / (24 * 60 * 60 * 1000));
              return await reply.status(429).send({
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
          return await reply.status(401).send({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
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
    emailNotifications: z.boolean().optional(),
  });

  fastify.post(
    '/api/auth/profile',
    {
      schema: {
        tags: ['auth'],
        summary: 'Update user profile',
        description: 'Updates profile metadata such as favorite suit, tagline, and avatar icon.',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        body: toJsonSchema(ProfileUpdateSchema),
        response: {
          200: toJsonSchema(
            z.object({
              user: UserSchema.extend({
                favoriteSuit: z.enum(['spades', 'hearts', 'diamonds', 'clubs']).nullable(),
                tagline: z.string().nullable(),
                avatarIcon: z.enum(AVATAR_ICONS).nullable(),
                emailNotifications: z.boolean(),
              }),
            }),
          ),
          400: toJsonSchema(ErrorResponseSchema),
          401: toJsonSchema(ErrorResponseSchema),
          404: toJsonSchema(ErrorResponseSchema),
          503: toJsonSchema(ErrorResponseSchema),
        },
      },
    },
    async (request, reply) => {
      return await traceHttpHandler('auth.profile', httpTraceContext(request, reply), async () => {
        const database = db;
        if (!database)
          return await reply
            .status(503)
            .send({ error: 'Database not available', code: 'DATABASE_UNAVAILABLE' });

        let token = request.headers.authorization?.replace('Bearer ', '');
        token ??= request.cookies.phalanx_refresh;
        if (!token)
          return await reply.status(401).send({ error: 'Unauthorized', code: 'UNAUTHORIZED' });

        let payload: { id: string };
        try {
          payload = fastify.jwt.verify<{ id: string }>(token);
        } catch {
          return await reply.status(401).send({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
        }

        const result = ProfileUpdateSchema.safeParse(request.body);
        if (!result.success) {
          return reply.status(400).send({
            error: 'Invalid input',
            code: 'INVALID_INPUT',
            details: z.formatError(result.error),
          });
        }

        const updates: Record<string, unknown> = { updatedAt: new Date() };
        if (result.data.favoriteSuit !== undefined) {
          updates.favoriteSuit = result.data.favoriteSuit;
        }
        if (result.data.tagline !== undefined) updates.tagline = result.data.tagline;
        if (result.data.avatarIcon !== undefined) updates.avatarIcon = result.data.avatarIcon;
        if (result.data.emailNotifications !== undefined)
          updates.emailNotifications = result.data.emailNotifications;

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
              emailNotifications: users.emailNotifications,
            }),
        );

        if (!updated)
          return await reply.status(404).send({ error: 'User not found', code: 'USER_NOT_FOUND' });
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
        security: [{ cookieAuth: [] }],
        response: {
          200: toJsonSchema(z.object({ ok: z.boolean() })),
        },
      },
    },
    async (_request, reply) => {
      reply.clearCookie('phalanx_refresh', { path: '/' });
      return { ok: true };
    },
  );

  const ForgotPasswordSchema = z.object({
    email: z.email(),
  });

  fastify.post(
    '/api/auth/forgot-password',
    {
      schema: {
        tags: ['auth'],
        summary: 'Request a password reset email',
        body: toJsonSchema(ForgotPasswordSchema),
        response: {
          200: toJsonSchema(z.object({ ok: z.boolean() })),
          400: toJsonSchema(ErrorResponseSchema),
          503: toJsonSchema(ErrorResponseSchema),
        },
      },
    },
    async (request, reply) => {
      return await traceHttpHandler(
        'auth.forgot-password',
        httpTraceContext(request, reply),
        async () => {
          const database = db;
          if (!database)
            return await reply
              .status(503)
              .send({ error: 'Database not available', code: 'DATABASE_UNAVAILABLE' });

          const result = ForgotPasswordSchema.safeParse(request.body);
          if (!result.success)
            return reply.status(400).send({ error: 'Invalid input', code: 'INVALID_INPUT' });

          const { email } = result.data;
          const [user] = await database.select().from(users).where(eq(users.email, email)).limit(1);

          if (!user) return { ok: true };

          const rawToken = crypto.randomBytes(32).toString('hex');
          const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
          const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

          await database.insert(passwordResetTokens).values({
            userId: user.id,
            tokenHash,
            expiresAt,
          });

          sendPasswordResetEmail(email, rawToken).catch((err) => {
            console.error('Failed to send async password reset email:', err);
          });

          return { ok: true };
        },
      );
    },
  );

  const ResetPasswordSchema = z.object({
    token: z.string(),
    newPassword: z.string().min(8),
  });

  fastify.post(
    '/api/auth/reset-password',
    {
      schema: {
        tags: ['auth'],
        summary: 'Reset password using token',
        body: toJsonSchema(ResetPasswordSchema),
        response: {
          200: toJsonSchema(z.object({ ok: z.boolean() })),
          400: toJsonSchema(ErrorResponseSchema),
          503: toJsonSchema(ErrorResponseSchema),
        },
      },
    },
    async (request, reply) => {
      return await traceHttpHandler(
        'auth.reset-password',
        httpTraceContext(request, reply),
        async () => {
          const database = db;
          if (!database)
            return await reply
              .status(503)
              .send({ error: 'Database not available', code: 'DATABASE_UNAVAILABLE' });

          const result = ResetPasswordSchema.safeParse(request.body);
          if (!result.success)
            return reply.status(400).send({ error: 'Invalid input', code: 'INVALID_INPUT' });

          const { token, newPassword } = result.data;
          const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

          const [resetTokenRow] = await database
            .select()
            .from(passwordResetTokens)
            .where(eq(passwordResetTokens.tokenHash, tokenHash))
            .limit(1);

          if (!resetTokenRow || resetTokenRow.usedAt || resetTokenRow.expiresAt < new Date()) {
            return reply
              .status(400)
              .send({ error: 'Invalid or expired token', code: 'INVALID_TOKEN' });
          }

          const passwordHash = await bcrypt.hash(newPassword, 12);

          await database.transaction(async (tx) => {
            await tx.update(users).set({ passwordHash }).where(eq(users.id, resetTokenRow.userId));
            await tx
              .update(passwordResetTokens)
              .set({ usedAt: new Date() })
              .where(eq(passwordResetTokens.id, resetTokenRow.id));
          });

          return { ok: true };
        },
      );
    },
  );
}
