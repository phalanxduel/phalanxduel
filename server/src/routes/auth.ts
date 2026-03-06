import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const RegisterSchema = z.object({
  name: z.string().min(1).max(50),
  email: z.string().email(),
  password: z.string().min(8),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export function registerAuthRoutes(fastify: FastifyInstance) {
  fastify.post('/api/auth/register', async (request, reply) => {
    if (!db) return reply.status(503).send({ error: 'Database not available' });

    const result = RegisterSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({ error: 'Invalid input', details: result.error.format() });
    }

    const { name, email, password } = result.data;

    // Check if user exists
    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0) {
      return reply.status(409).send({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [user] = await db
      .insert(users)
      .values({
        name,
        email,
        passwordHash,
      })
      .returning({ id: users.id, name: users.name, email: users.email });

    const token = fastify.jwt.sign({ id: user!.id, name: user!.name });
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

    const token = fastify.jwt.sign({ id: user.id, name: user.name });
    return { token, user: { id: user.id, name: user.name, email: user.email, elo: user.elo } };
  });

  fastify.get('/api/auth/me', async (request, reply) => {
    try {
      await request.jwtVerify();
      const payload = request.user as { id: string };

      if (!db) return reply.status(503).send({ error: 'Database not available' });

      const [user] = await db.select().from(users).where(eq(users.id, payload.id)).limit(1);
      if (!user) return reply.status(404).send({ error: 'User not found' });

      return { id: user.id, name: user.name, email: user.email, elo: user.elo };
    } catch {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
  });
}
