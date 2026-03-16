import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { sql } from 'drizzle-orm';
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { requireAdmin } from '../middleware/auth.js';
import { db } from '../db.js';

export function registerUserRoutes(fastify: FastifyInstance) {
  // GET /admin-api/users — paginated user list with match counts
  fastify.get<{ Querystring: unknown }>('/admin-api/users', async (request, reply) => {
    const admin = await requireAdmin(request, reply);
    if (!admin) return;

    const query = z
      .object({
        limit: z.coerce.number().int().min(1).max(200).default(50),
        offset: z.coerce.number().int().min(0).default(0),
      })
      .parse(request.query ?? {});

    const rows = await db.execute(sql`
      SELECT
        u.id,
        u.gamertag,
        u.suffix,
        u.email,
        u.elo,
        u.is_admin,
        u.created_at,
        COUNT(m.id)::int AS match_count,
        MAX(m.created_at) AS last_match_at
      FROM users u
      LEFT JOIN matches m ON m.player_1_id = u.id OR m.player_2_id = u.id
      GROUP BY u.id
      ORDER BY u.created_at DESC
      LIMIT ${query.limit} OFFSET ${query.offset}
    `);

    return reply.status(200).send(rows);
  });

  // GET /admin-api/users/:userId
  fastify.get<{ Params: { userId: string } }>(
    '/admin-api/users/:userId',
    async (request, reply) => {
      const admin = await requireAdmin(request, reply);
      if (!admin) return;

      const { userId } = request.params;

      const userRows = await db.execute(sql`
      SELECT id, gamertag, suffix, email, elo, is_admin, created_at, updated_at
      FROM users WHERE id = ${userId} LIMIT 1
    `);
      if (!userRows[0]) {
        return reply.status(404).send({ error: 'User not found', code: 'NOT_FOUND' });
      }

      const matchRows = await db.execute(sql`
      SELECT id, player_1_name, player_2_name, bot_strategy, status, outcome, created_at
      FROM matches
      WHERE player_1_id = ${userId} OR player_2_id = ${userId}
      ORDER BY created_at DESC LIMIT 50
    `);

      const snapshotRows = await db.execute(sql`
      SELECT id, category, elo, k_factor, window_days, matches_in_window, wins_in_window, computed_at
      FROM elo_snapshots WHERE user_id = ${userId}
      ORDER BY computed_at DESC
    `);

      return reply
        .status(200)
        .send({ user: userRows[0], matches: matchRows, snapshots: snapshotRows });
    },
  );

  // POST /admin-api/users/:userId/reset-password
  fastify.post<{ Params: { userId: string } }>(
    '/admin-api/users/:userId/reset-password',
    async (request, reply) => {
      const admin = await requireAdmin(request, reply);
      if (!admin) return;

      const { userId } = request.params;

      const tempPassword = randomBytes(8).toString('hex'); // 16 hex chars
      const passwordHash = await bcrypt.hash(tempPassword, 12);

      await db.execute(
        sql`UPDATE users SET password_hash = ${passwordHash}, updated_at = NOW() WHERE id = ${userId}`,
      );
      await db.execute(sql`
      INSERT INTO admin_audit_log (actor_id, action, target_id, metadata)
      VALUES (${admin.id}, 'reset_password', ${userId}, '{"temp": true}'::jsonb)
    `);

      return reply.status(200).send({ tempPassword });
    },
  );

  // PATCH /admin-api/users/:userId/admin — toggle is_admin with self-revocation guard
  fastify.patch<{ Params: { userId: string }; Body: unknown }>(
    '/admin-api/users/:userId/admin',
    async (request, reply) => {
      const admin = await requireAdmin(request, reply);
      if (!admin) return;

      const { userId } = request.params;

      // Self-revocation guard
      if (userId === admin.id) {
        return reply.status(400).send({
          error: 'Cannot modify your own admin status',
          code: 'SELF_REVOCATION_FORBIDDEN',
        });
      }

      const parsed = z.object({ isAdmin: z.boolean() }).safeParse(request.body);
      if (!parsed.success) {
        return reply
          .status(400)
          .send({ error: 'isAdmin boolean required', code: 'VALIDATION_ERROR' });
      }

      await db.execute(
        sql`UPDATE users SET is_admin = ${parsed.data.isAdmin}, updated_at = NOW() WHERE id = ${userId}`,
      );
      await db.execute(sql`
      INSERT INTO admin_audit_log (actor_id, action, target_id, metadata)
      VALUES (${admin.id}, 'toggle_admin', ${userId}, ${JSON.stringify({ isAdmin: parsed.data.isAdmin })}::jsonb)
    `);

      return reply.status(200).send({ ok: true });
    },
  );
}
