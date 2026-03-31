import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { sql } from 'drizzle-orm';
import { requireAdmin } from '../middleware/auth.js';
import { db } from '../db.js';

const MatchListQuery = z.object({
  status: z.enum(['active', 'completed', 'all']).default('all'),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export function registerMatchRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: unknown }>('/admin-api/matches', async (request, reply) => {
    const admin = await requireAdmin(request, reply);
    if (!admin) return;

    const query = MatchListQuery.parse(request.query ?? {});
    const statusFilter = query.status === 'all' ? sql`1=1` : sql`status = ${query.status}`;

    const rows = await db.execute(sql`
      SELECT
        id,
        player_1_name,
        player_2_name,
        bot_strategy,
        status,
        outcome,
        created_at,
        updated_at,
        jsonb_array_length(transaction_log) AS total_turns,
        (
          SELECT COUNT(*)::int
          FROM jsonb_array_elements(transaction_log) AS entry
          WHERE entry->>'turnHash' IS NOT NULL
        ) AS verified_turns
      FROM matches
      WHERE ${statusFilter}
      ORDER BY created_at DESC
      LIMIT ${query.limit}
    `);

    return reply.status(200).send(rows);
  });

  fastify.get<{ Params: { matchId: string } }>(
    '/admin-api/matches/:matchId',
    async (request, reply) => {
      const admin = await requireAdmin(request, reply);
      if (!admin) return;

      const { matchId } = request.params;

      const rows = await db.execute(sql`
      SELECT
        id,
        player_1_id,
        player_2_id,
        player_1_name,
        player_2_name,
        bot_strategy,
        config,
        state,
        action_history,
        transaction_log,
        outcome,
        event_log,
        event_log_fingerprint,
        status,
        created_at,
        updated_at
      FROM matches
      WHERE id = ${matchId}
      LIMIT 1
    `);

      if (!rows[0]) {
        return reply.status(404).send({ error: 'Match not found', code: 'NOT_FOUND' });
      }

      return reply.status(200).send(rows[0]);
    },
  );

  const CreateMatchBody = z.object({
    playerName: z.string().min(1).max(50),
    opponent: z.enum(['bot-random', 'human']),
    matchParams: z
      .object({
        rows: z.number().int().min(1).max(12).optional(),
        columns: z.number().int().min(1).max(12).optional(),
        maxHandSize: z.number().int().min(0).optional(),
      })
      .optional(),
    gameOptions: z
      .object({
        damageMode: z.enum(['classic', 'cumulative']).optional(),
        startingLifepoints: z.number().int().min(1).max(500).optional(),
      })
      .optional(),
    rngSeed: z.number().optional(),
  });

  fastify.post<{ Body: unknown }>('/admin-api/matches', async (request, reply) => {
    const admin = await requireAdmin(request, reply);
    if (!admin) return;

    const parsed = CreateMatchBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid body', code: 'VALIDATION_ERROR' });
    }

    const gameServerUrl = process.env.GAME_SERVER_INTERNAL_URL ?? 'http://127.0.0.1:3001';
    const token = process.env.ADMIN_INTERNAL_TOKEN;
    if (!token) {
      return reply
        .status(503)
        .send({ error: 'Admin token not configured', code: 'NOT_CONFIGURED' });
    }

    let upstream: Response;
    try {
      upstream = await fetch(`${gameServerUrl}/internal/matches`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(parsed.data),
      });
    } catch {
      return reply.status(502).send({ error: 'Game server unreachable', code: 'UPSTREAM_ERROR' });
    }

    const upstreamBody = (await upstream.json().catch(() => ({}))) as { matchId?: string };

    if (!upstream.ok || !upstreamBody.matchId) {
      return reply.status(upstream.status).send(upstreamBody);
    }

    // Record in audit log
    await db.execute(sql`
      INSERT INTO admin_audit_log (actor_id, action, metadata)
      VALUES (${admin.id}, 'create_match', ${JSON.stringify({ matchId: upstreamBody.matchId, ...parsed.data })}::jsonb)
    `);

    return reply.status(201).send(upstreamBody);
  });
}
