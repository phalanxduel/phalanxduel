import { timingSafeEqual } from 'node:crypto';
import type { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Validates the ADMIN_INTERNAL_TOKEN Bearer header.
 * Uses timing-safe comparison to resist timing attacks.
 * Returns true if valid; sends the error response and returns false otherwise.
 */
export function validateInternalToken(request: FastifyRequest, reply: FastifyReply): boolean {
  const header = request.headers['authorization'];
  const match = /^Bearer\s+(.+)$/.exec(header ?? '');
  if (!match) {
    void reply.status(401).send({ error: 'Missing Bearer token', code: 'UNAUTHORIZED' });
    return false;
  }

  const expected = process.env['ADMIN_INTERNAL_TOKEN'];
  if (!expected) {
    // Token provided but endpoint not configured — reject with 401 to avoid leaking config info
    void reply.status(401).send({ error: 'Invalid token', code: 'UNAUTHORIZED' });
    return false;
  }

  const provided = match[1]!;
  const MAX = 512;
  const buf1 = Buffer.alloc(MAX);
  const buf2 = Buffer.alloc(MAX);
  buf1.write(provided.slice(0, MAX), 'utf8');
  buf2.write(expected.slice(0, MAX), 'utf8');

  if (!timingSafeEqual(buf1, buf2)) {
    void reply.status(401).send({ error: 'Invalid token', code: 'UNAUTHORIZED' });
    return false;
  }

  return true;
}
