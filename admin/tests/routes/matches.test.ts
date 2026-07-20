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

describe('POST /admin-api/matches/:id/terminate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
    process.env.ADMIN_INTERNAL_TOKEN = 'test-token';
  });

  it('forwards termination request to game server', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ terminated: true }),
    } as Response);

    const app = await buildAdminApp();
    const matchId = '00000000-0000-0000-0000-000000000000';
    const res = await app.inject({
      method: 'POST',
      url: `/admin-api/matches/${matchId}/terminate`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ terminated: true });
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining(`/internal/matches/${matchId}/terminate`),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      }),
    );
    const { db } = await import('../../src/server/db.js');
    expect(db.execute).toHaveBeenCalledTimes(1);
    await app.close();
  });
});

describe('POST /admin-api/matches/:id/rollback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
    process.env.ADMIN_INTERNAL_TOKEN = 'test-token';
  });

  it('forwards rollback request with sequence number', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    } as Response);

    const app = await buildAdminApp();
    const matchId = '00000000-0000-0000-0000-000000000000';
    const res = await app.inject({
      method: 'POST',
      url: `/admin-api/matches/${matchId}/rollback`,
      payload: { targetSequenceNumber: 5 },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ success: true });
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining(`/internal/matches/${matchId}/rollback`),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ targetSequenceNumber: 5 }),
      }),
    );
    await app.close();
  });

  it('returns 400 for invalid sequence number', async () => {
    const app = await buildAdminApp();
    const res = await app.inject({
      method: 'POST',
      url: '/admin-api/matches/00000000-0000-0000-0000-000000000000/rollback',
      payload: { targetSequenceNumber: -1 },
    });

    expect(res.statusCode).toBe(400);
    await app.close();
  });
});
