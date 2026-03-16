import type { FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db.js';
import { sql } from 'drizzle-orm';

export interface AdminUser {
  id: string;
  gamertag: string;
  suffix: number | null;
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
    payload = request.server.jwt.verify(request.cookies['admin_token'] ?? '') as AdminUser;
  } catch {
    void reply.status(401).send({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
    return null;
  }

  const rows = await db.execute(sql`SELECT is_admin FROM users WHERE id = ${payload.id} LIMIT 1`);

  if (!rows[0] || !(rows[0] as { is_admin: boolean }).is_admin) {
    void reply.status(403).send({ error: 'Forbidden — not an admin', code: 'FORBIDDEN' });
    return null;
  }

  return payload;
}
