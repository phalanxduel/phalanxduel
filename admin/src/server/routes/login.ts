import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

const LoginBody = z.object({
  email: z.string().email(),
  password: z.string(),
});

export function registerLoginRoute(fastify: FastifyInstance) {
  fastify.post<{ Body: unknown }>('/admin-api/auth/login', async (request, reply) => {
    const parsed = LoginBody.safeParse(request.body);
    if (!parsed.success) {
      return reply
        .status(400)
        .send({ error: 'Invalid credentials format', code: 'VALIDATION_ERROR' });
    }

    const gameServerUrl = process.env['GAME_SERVER_INTERNAL_URL'] ?? 'http://localhost:3001';

    let upstream: Response;
    try {
      upstream = await fetch(`${gameServerUrl}/api/auth/login`, {
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

    let payload: { id: string; gamertag: string; suffix: number | null };
    try {
      payload = fastify.jwt.verify(token) as typeof payload;
    } catch {
      return reply
        .status(401)
        .send({ error: 'Invalid token from game server', code: 'UNAUTHORIZED' });
    }

    void reply.setCookie('admin_token', token, {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
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
