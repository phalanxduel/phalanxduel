import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq, sql } from 'drizzle-orm';
import { validateGamertagFull, assignGamertagSuffix } from '../gamertag.js';
import { normalizeGamertag } from '@phalanxduel/shared';

const RegisterSchema = z.object({
  gamertag: z.string().min(3).max(20),
  email: z.string().email(),
  password: z.string().min(8),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const ChangeGamertagSchema = z.object({
  gamertag: z.string().min(3).max(20),
});

async function assignSuffixInTransaction(
  tx: Parameters<Parameters<NonNullable<typeof db>['transaction']>[0]>[0],
  normalized: string,
) {
  const [info] = await tx
    .select({
      maxSuffix: sql<number | null>`MAX(${users.suffix})`,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(users)
    .where(eq(users.gamertagNormalized, normalized));

  const existingInfo =
    info && info.count > 0 ? { maxSuffix: info.maxSuffix, count: info.count } : null;
  const { newSuffix, updateExisting } = assignGamertagSuffix(existingInfo);

  if (updateExisting !== null) {
    await tx
      .update(users)
      .set({ suffix: updateExisting })
      .where(eq(users.gamertagNormalized, normalized));
  }

  return newSuffix;
}

export function registerAuthRoutes(fastify: FastifyInstance) {
  fastify.post('/api/auth/register', async (request, reply) => {
    if (!db) return reply.status(503).send({ error: 'Database not available' });

    const result = RegisterSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({ error: 'Invalid input', details: result.error.format() });
    }

    const { gamertag, email, password } = result.data;

    const validationError = validateGamertagFull(gamertag);
    if (validationError) {
      return reply.status(400).send({ error: validationError });
    }

    const normalized = normalizeGamertag(gamertag);

    // Check if email already exists
    const existingEmail = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existingEmail.length > 0) {
      return reply.status(409).send({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await db.transaction(async (tx) => {
      const suffix = await assignSuffixInTransaction(tx, normalized);

      const [inserted] = await tx
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
        });

      return inserted!;
    });

    const token = fastify.jwt.sign({ id: user.id, gamertag: user.gamertag, suffix: user.suffix });
    reply.setCookie('phalanx_refresh', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });
    return { token, user };
  });

  fastify.post('/api/auth/login', async (request, reply) => {
    if (!db) return reply.status(503).send({ error: 'Database not available' });

    const result = LoginSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({ error: 'Invalid input' });
    }

    const { email, password } = result.data;

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    const token = fastify.jwt.sign({ id: user.id, gamertag: user.gamertag, suffix: user.suffix });
    reply.setCookie('phalanx_refresh', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
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

  fastify.get('/api/auth/me', async (request, reply) => {
    try {
      let token = request.headers['authorization']?.replace('Bearer ', '');
      if (!token) {
        token = request.cookies['phalanx_refresh'];
      }
      if (!token) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const payload = fastify.jwt.verify(token) as { id: string };

      if (!db) return reply.status(503).send({ error: 'Database not available' });

      const [user] = await db.select().from(users).where(eq(users.id, payload.id)).limit(1);
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

  fastify.post('/api/auth/gamertag', async (request, reply) => {
    try {
      let token = request.headers['authorization']?.replace('Bearer ', '');
      if (!token) {
        token = request.cookies['phalanx_refresh'];
      }
      if (!token) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const payload = fastify.jwt.verify(token) as { id: string };

      if (!db) return reply.status(503).send({ error: 'Database not available' });

      const result = ChangeGamertagSchema.safeParse(request.body);
      if (!result.success) {
        return reply.status(400).send({ error: 'Invalid input', details: result.error.format() });
      }

      const { gamertag } = result.data;

      const validationError = validateGamertagFull(gamertag);
      if (validationError) {
        return reply.status(400).send({ error: validationError });
      }

      const normalized = normalizeGamertag(gamertag);

      const [currentUser] = await db.select().from(users).where(eq(users.id, payload.id)).limit(1);
      if (!currentUser) {
        return reply.status(404).send({ error: 'User not found' });
      }

      // Check cooldown: 7 days between gamertag changes
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

      const user = await db.transaction(async (tx) => {
        const suffix = await assignSuffixInTransaction(tx, normalized);

        const [updated] = await tx
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
          });

        return updated!;
      });

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

  fastify.post('/api/auth/profile', async (request, reply) => {
    if (!db) return reply.status(503).send({ error: 'Database not available' });

    let token = request.headers['authorization']?.replace('Bearer ', '');
    if (!token) token = request.cookies['phalanx_refresh'];
    if (!token) return reply.status(401).send({ error: 'Unauthorized' });

    let payload: { id: string };
    try {
      payload = fastify.jwt.verify(token) as { id: string };
    } catch {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const result = ProfileUpdateSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({ error: 'Invalid input', details: result.error.format() });
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (result.data.favoriteSuit !== undefined) updates['favoriteSuit'] = result.data.favoriteSuit;
    if (result.data.tagline !== undefined) updates['tagline'] = result.data.tagline;
    if (result.data.avatarIcon !== undefined) updates['avatarIcon'] = result.data.avatarIcon;

    const [updated] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, payload.id))
      .returning({
        id: users.id,
        gamertag: users.gamertag,
        suffix: users.suffix,
        email: users.email,
        elo: users.elo,
        favoriteSuit: users.favoriteSuit,
        tagline: users.tagline,
        avatarIcon: users.avatarIcon,
      });

    if (!updated) return reply.status(404).send({ error: 'User not found' });
    return { user: updated };
  });

  fastify.post('/api/auth/logout', async (_request, reply) => {
    reply.clearCookie('phalanx_refresh', { path: '/' });
    return { ok: true };
  });
}
