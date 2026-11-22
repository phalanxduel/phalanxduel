import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { MATCH_CONSTRAINTS } from '@phalanxduel/shared';
import { sql } from 'drizzle-orm';
import { withAdmin, withAdminProxy } from '../middleware/route-aspect.js';
import { db } from '../db.js';

const MatchListQuery = z.object({
  status: z.enum(['active', 'completed', 'all']).default('all'),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

const RetentionQuery = z.object({
  olderThan: z.string().datetime({ offset: true }),
});

const CreateMatchBody = z.object({
  playerName: z.string().min(1).max(50),
  opponent: z.enum(['bot-random', 'human']),
  matchParams: z
    .object({
      rows: z
        .number()
        .int()
        .min(MATCH_CONSTRAINTS.rows.min)
        .max(MATCH_CONSTRAINTS.rows.max)
        .optional(),
      columns: z
        .number()
        .int()
        .min(MATCH_CONSTRAINTS.columns.min)
        .max(MATCH_CONSTRAINTS.columns.max)
        .optional(),
      maxHandSize: z.number().int().min(MATCH_CONSTRAINTS.maxHandSize.min).optional(),
    })
    .optional(),
  gameOptions: z
    .object({
      damageMode: z.enum(['classic', 'cumulative']).optional(),
      startingLifepoints: z
        .number()
        .int()
        .min(MATCH_CONSTRAINTS.startingLifepoints.min)
        .max(MATCH_CONSTRAINTS.startingLifepoints.max)
        .optional(),
    })
    .optional(),
  rngSeed: z.number().optional(),
});

export function registerMatchRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: unknown }>(
    '/admin-api/matches/retention',
    withAdmin<{ Querystring: unknown }>(async (request, reply) => {
      const parsed = RetentionQuery.safeParse(request.query ?? {});
      if (!parsed.success)
        return reply.status(400).send({ error: 'olderThan must be an ISO timestamp' });
      const rows = await db.execute(sql`
      SELECT COUNT(*)::int AS count, MIN(created_at) AS oldest
      FROM matches
      WHERE status IN ('pending', 'active', 'cancelled')
        AND COALESCE(updated_at, created_at) < ${parsed.data.olderThan}::timestamptz
    `);
      return reply.send({
        olderThan: parsed.data.olderThan,
        eligible: rows[0] ?? { count: 0, oldest: null },
      });
    }),
  );

  fastify.post<{ Body: unknown }>(
    '/admin-api/matches/retention/purge',
    withAdmin<{ Body: unknown }>(async (request, reply, admin) => {
      const parsed = RetentionQuery.safeParse(request.body ?? {});
      if (!parsed.success)
        return reply.status(400).send({ error: 'olderThan must be an ISO timestamp' });
      // Match history has dependent rows without cascading foreign keys. Delete
      // the stale graph in one statement so retention cannot leave orphans or
      // fail with a generic FK error.
      const rows = await db.execute(sql`
      WITH stale AS MATERIALIZED (
        SELECT id FROM matches
        WHERE status IN ('pending', 'active', 'cancelled')
          AND COALESCE(updated_at, created_at) < ${parsed.data.olderThan}::timestamptz
      ),
      a AS (DELETE FROM match_actions x USING stale s WHERE x.match_id = s.id),
      c AS (DELETE FROM match_comments x USING stale s WHERE x.match_id = s.id),
      e AS (DELETE FROM match_embeddings x USING stale s WHERE x.match_id = s.id),
      f AS (DELETE FROM match_favorites x USING stale s WHERE x.match_id = s.id),
      p AS (DELETE FROM match_payloads x USING stale s WHERE x.match_id = s.id),
      r AS (DELETE FROM match_ratings x USING stale s WHERE x.match_id = s.id),
      mr AS (DELETE FROM match_results x USING stale s WHERE x.match_id = s.id),
      t AS (DELETE FROM transaction_logs x USING stale s WHERE x.match_id = s.id)
      DELETE FROM matches x USING stale s WHERE x.id = s.id
      RETURNING x.id
    `);
      await db.execute(sql`
      INSERT INTO admin_audit_log (actor_id, action, metadata)
      VALUES (${admin.id}, 'purge_stale_matches', ${JSON.stringify({ olderThan: parsed.data.olderThan, count: rows.length })}::jsonb)
    `);
      return reply.send({ purged: rows.length, olderThan: parsed.data.olderThan });
    }),
  );

  fastify.get<{ Querystring: unknown }>(
    '/admin-api/matches',
    withAdmin<{ Querystring: unknown }>(async (request, reply) => {
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
    }),
  );

  fastify.get<{ Params: { matchId: string } }>(
    '/admin-api/matches/:matchId',
    withAdmin<{ Params: { matchId: string } }>(async (request, reply) => {
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
    }),
  );

  fastify.post<{ Body: unknown }>(
    '/admin-api/matches',
    withAdminProxy<{ Body: unknown }>(async (request, reply, { admin, fetchUpstream }) => {
      const parsed = CreateMatchBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'Invalid body', code: 'VALIDATION_ERROR' });
      }

      const upstream = await fetchUpstream('/internal/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });
      if (!upstream) return;

      const upstreamBody = (await upstream.json().catch(() => ({}))) as { matchId?: string };

      if (!upstream.ok || !upstreamBody.matchId) {
        return reply.status(upstream.status).send(upstreamBody);
      }

      await db.execute(sql`
      INSERT INTO admin_audit_log (actor_id, action, metadata)
      VALUES (${admin.id}, 'create_match', ${JSON.stringify({ matchId: upstreamBody.matchId, ...parsed.data })}::jsonb)
    `);

      return reply.status(201).send(upstreamBody);
    }),
  );

  fastify.post<{ Params: { matchId: string } }>(
    '/admin-api/matches/:matchId/terminate',
    withAdminProxy<{ Params: { matchId: string } }>(
      async (request, reply, { admin, fetchUpstream }) => {
        const { matchId } = request.params;

        const upstream = await fetchUpstream(`/internal/matches/${matchId}/terminate`, {
          method: 'POST',
        });
        if (!upstream) return;

        if (!upstream.ok) {
          const errBody = (await upstream.json().catch(() => ({}))) as { error?: string };
          return reply.status(upstream.status).send(errBody);
        }

        await db.execute(sql`
      INSERT INTO admin_audit_log (actor_id, action, metadata)
      VALUES (${admin.id}, 'terminate_match', ${JSON.stringify({ matchId })}::jsonb)
    `);

        return reply.status(200).send({ terminated: true });
      },
    ),
  );

  fastify.post<{ Params: { matchId: string }; Body: { targetSequenceNumber: number } }>(
    '/admin-api/matches/:matchId/rollback',
    withAdminProxy<{ Params: { matchId: string }; Body: { targetSequenceNumber: number } }>(
      async (request, reply, { admin, fetchUpstream }) => {
        const { matchId } = request.params;
        const { targetSequenceNumber } = request.body;

        if (typeof targetSequenceNumber !== 'number' || targetSequenceNumber < 0) {
          return reply
            .status(400)
            .send({ error: 'Invalid target sequence number', code: 'VALIDATION_ERROR' });
        }

        const upstream = await fetchUpstream(`/internal/matches/${matchId}/rollback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetSequenceNumber }),
        });
        if (!upstream) return;

        if (!upstream.ok) {
          const errBody = (await upstream.json().catch(() => ({}))) as { error?: string };
          return reply.status(upstream.status).send(errBody);
        }

        await db.execute(sql`
      INSERT INTO admin_audit_log (actor_id, action, metadata)
      VALUES (${admin.id}, 'rollback_match', ${JSON.stringify({ matchId, targetSequenceNumber })}::jsonb)
    `);

        return reply.status(200).send({ success: true });
      },
    ),
  );

  // POST /admin-api/comments/:commentId/remove
  fastify.post<{ Params: { commentId: string }; Body: { reason: string } }>(
    '/admin-api/comments/:commentId/remove',
    withAdminProxy<{ Params: { commentId: string }; Body: { reason: string } }>(
      async (request, reply, { admin, fetchUpstream }) => {
        const { commentId } = request.params;
        const { reason } = request.body;

        const res = await fetchUpstream(`/internal/comments/${commentId}/remove`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason, actorId: admin.id }),
        });
        if (!res) return;

        return reply.status(res.status).send(await res.json());
      },
    ),
  );
}
