import type { FastifyInstance } from 'fastify';
import { withAdminProxy } from '../middleware/route-aspect.js';

export function registerSystemRoutes(fastify: FastifyInstance): void {
  fastify.get(
    '/admin-api/system/ab-tests',
    withAdminProxy(async (_request, reply, { fetchUpstream }) => {
      const upstream = await fetchUpstream('/internal/admin/ab-tests');
      if (!upstream) return;
      const body = await upstream.json().catch(() => ({}));
      return reply.status(upstream.status).send(body);
    }),
  );

  fastify.get<{ Params: { matchId: string } }>(
    '/admin-api/matches/:matchId/replay',
    withAdminProxy<{ Params: { matchId: string } }>(async (request, reply, { fetchUpstream }) => {
      const upstream = await fetchUpstream(
        `/internal/matches/${encodeURIComponent(request.params.matchId)}/replay`,
      );
      if (!upstream) return;
      const body = await upstream.json().catch(() => ({}));
      return reply.status(upstream.status).send(body);
    }),
  );
}
