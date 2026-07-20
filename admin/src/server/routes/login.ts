import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { gameServerInternalUrl } from '../config.js';
import { isAdminUser } from '../middleware/auth.js';

const LoginBody = z.object({
  email: z.email(),
  password: z.string(),
});

const AdminTokenPayload = z.object({
  id: z.uuid(),
  gamertag: z.string(),
  suffix: z.number().int().nullable(),
});

export function registerLoginRoute(fastify: FastifyInstance) {
  fastify.post<{ Body: unknown }>('/admin-api/auth/login', async (request, reply) => {
    const parsed = LoginBody.safeParse(request.body);
    if (!parsed.success) {
      return reply
        .status(400)
        .send({ error: 'Invalid credentials format', code: 'VALIDATION_ERROR' });
    }

    let upstream: Response;
    try {
      upstream = await fetch(`${gameServerInternalUrl()}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });
    } catch {
      return reply.status(502).send({ error: 'Game server unreachable', code: 'UPSTREAM_ERROR' });
    }

    if (!upstream.ok) {
      return reply.status(upstream.status).send(await upstream.json().catch(() => ({})));
    }

    const { token } = (await upstream.json()) as { token: string };

    let payload: z.infer<typeof AdminTokenPayload>;
    try {
      payload = AdminTokenPayload.parse(fastify.jwt.verify(token) as unknown);
    } catch {
      return reply
        .status(401)
        .send({ error: 'Invalid token from game server', code: 'UNAUTHORIZED' });
    }

    if (!(await isAdminUser(payload.id))) {
      return reply.status(403).send({ error: 'Forbidden — not an admin', code: 'FORBIDDEN' });
    }

    void reply.setCookie('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });

    return reply.status(200).send({ ok: true, gamertag: payload.gamertag, suffix: payload.suffix });
  });

  fastify.post('/admin-api/auth/logout', async (_request, reply) => {
    void reply.clearCookie('admin_token', { path: '/' });
    return reply.status(200).send({ ok: true });
  });
}
