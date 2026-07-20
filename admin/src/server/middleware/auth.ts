import type { FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db.js';
import { sql } from 'drizzle-orm';
import { z } from 'zod';

export interface AdminUser {
  readonly id: string;
  readonly gamertag: string;
  readonly suffix: number | null;
}

const AdminUserSchema = z.object({
  id: z.uuid(),
  gamertag: z.string(),
  suffix: z.number().int().nullable(),
});

export async function isAdminUser(userId: string): Promise<boolean> {
  const rows = await db.execute(sql`SELECT is_admin FROM users WHERE id = ${userId} LIMIT 1`);
  const row = rows[0] as { is_admin?: unknown } | undefined;
  return row?.is_admin === true;
}

/**
 * Verifies the admin_token cookie contains a valid JWT,
 * then confirms users.is_admin = true in the DB.
 * Returns the user payload, or sends 401/403 and returns null.
 */
export async function requireAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<AdminUser | null> {
  let payload: AdminUser;

  try {
    payload = AdminUserSchema.parse(
      request.server.jwt.verify(request.cookies.admin_token ?? '') as unknown,
    );
  } catch {
    void reply.status(401).send({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
    return null;
  }

  if (!(await isAdminUser(payload.id))) {
    void reply.status(403).send({ error: 'Forbidden — not an admin', code: 'FORBIDDEN' });
    return null;
  }

  return payload;
}
