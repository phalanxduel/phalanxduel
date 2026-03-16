import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildAdminApp } from '../../src/server/index.js';

vi.mock('../../src/server/middleware/auth.js', () => ({
  requireAdmin: vi.fn().mockResolvedValue({ id: 'admin-id', gamertag: 'admin', suffix: 1 }),
}));
vi.mock('../../src/server/db.js', () => ({
  db: { execute: vi.fn().mockResolvedValue([]) },
}));

describe('GET /admin-api/matches', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when not authenticated', async () => {
    const { requireAdmin } = await import('../../src/server/middleware/auth.js');
    vi.mocked(requireAdmin).mockImplementationOnce(async (_request, reply) => {
      await reply.status(401).send({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
      return null;
    });
    const app = await buildAdminApp();
    const res = await app.inject({ method: 'GET', url: '/admin-api/matches' });
    expect(res.statusCode).toBe(401);
    await app.close();
  });

  it('returns 200 with array when authenticated', async () => {
    const app = await buildAdminApp();
    const res = await app.inject({ method: 'GET', url: '/admin-api/matches' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toBeInstanceOf(Array);
    await app.close();
  });
});
