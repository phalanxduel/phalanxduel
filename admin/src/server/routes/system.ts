import type { FastifyInstance } from 'fastify';
import { adminInternalToken, gameServerInternalUrl } from '../config.js';
import { requireAdmin } from '../middleware/auth.js';

async function authenticatedGameServerRead(
  path: string,
): Promise<{ readonly upstream: Response } | { readonly error: 'not-configured' | 'unreachable' }> {
  const token = adminInternalToken();
  if (!token) return { error: 'not-configured' };

  try {
    const upstream = await fetch(`${gameServerInternalUrl()}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return { upstream };
  } catch {
    return { error: 'unreachable' };
  }
}

export function registerSystemRoutes(fastify: FastifyInstance): void {
  fastify.get('/admin-api/system/ab-tests', async (request, reply) => {
    const admin = await requireAdmin(request, reply);
    if (!admin) return;

    const result = await authenticatedGameServerRead('/internal/admin/ab-tests');
    if ('error' in result) {
      const message =
        result.error === 'not-configured'
          ? 'Admin token not configured'
          : 'Game server unreachable';
      const code = result.error === 'not-configured' ? 'NOT_CONFIGURED' : 'UPSTREAM_ERROR';
      return reply
        .status(result.error === 'not-configured' ? 503 : 502)
        .send({ error: message, code });
    }

    const body = await result.upstream.json().catch(() => ({}));
    return reply.status(result.upstream.status).send(body);
  });

  fastify.get<{ Params: { matchId: string } }>(
    '/admin-api/matches/:matchId/replay',
    async (request, reply) => {
      const admin = await requireAdmin(request, reply);
      if (!admin) return;

      const result = await authenticatedGameServerRead(
        `/internal/matches/${encodeURIComponent(request.params.matchId)}/replay`,
      );
      if ('error' in result) {
        const message =
          result.error === 'not-configured'
            ? 'Admin token not configured'
            : 'Game server unreachable';
        const code = result.error === 'not-configured' ? 'NOT_CONFIGURED' : 'UPSTREAM_ERROR';
        return reply
          .status(result.error === 'not-configured' ? 503 : 502)
          .send({ error: message, code });
      }

      const body = await result.upstream.json().catch(() => ({}));
      return reply.status(result.upstream.status).send(body);
    },
  );
}
