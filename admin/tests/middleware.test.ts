import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildAdminApp } from '../src/server/index.js';

// Mock the db module to avoid needing a real DB in tests
vi.mock('../src/server/db.js', () => ({
  db: {
    execute: vi.fn().mockResolvedValue([{ is_admin: true }]),
  },
}));

describe('Auth middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns 401 when no admin_token cookie is present', async () => {
    const app = await buildAdminApp();
    const res = await app.inject({
      method: 'GET',
      url: '/admin-api/matches',
    });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
    await app.close();
  });

  it('returns 401 for a malformed admin token', async () => {
    const app = await buildAdminApp();
    const res = await app.inject({
      method: 'GET',
      url: '/admin-api/matches',
      cookies: { admin_token: 'not-a-jwt' },
    });
    expect(res.statusCode).toBe(401);
    await app.close();
  });

  it('returns 403 when the authenticated user is not an administrator', async () => {
    const { db } = await import('../src/server/db.js');
    vi.mocked(db.execute).mockResolvedValueOnce([{ is_admin: false }]);
    const app = await buildAdminApp();
    const token = app.jwt.sign({
      id: '11111111-1111-4111-8111-111111111111',
      gamertag: 'operator',
      suffix: 1,
    });
    const res = await app.inject({
      method: 'GET',
      url: '/admin-api/matches',
      cookies: { admin_token: token },
    });
    expect(res.statusCode).toBe(403);
    await app.close();
  });

  it('allows an administrator to perform a harmless authenticated read', async () => {
    const { db } = await import('../src/server/db.js');
    vi.mocked(db.execute)
      .mockResolvedValueOnce([{ is_admin: true }])
      .mockResolvedValueOnce([]);
    const app = await buildAdminApp();
    const token = app.jwt.sign({
      id: '11111111-1111-4111-8111-111111111111',
      gamertag: 'operator',
      suffix: 1,
    });
    const res = await app.inject({
      method: 'GET',
      url: '/admin-api/matches?limit=1',
      cookies: { admin_token: token },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
    await app.close();
  });

  it('exposes safe liveness and database-backed readiness', async () => {
    const { db } = await import('../src/server/db.js');
    vi.mocked(db.execute).mockResolvedValueOnce([]);
    const app = await buildAdminApp();

    const health = await app.inject({ method: 'GET', url: '/health' });
    const ready = await app.inject({ method: 'GET', url: '/ready' });

    expect(health.statusCode).toBe(200);
    expect(health.json()).toMatchObject({ status: 'ok', service: 'phalanx-admin' });
    expect(ready.statusCode).toBe(200);
    expect(ready.json()).toMatchObject({ ready: true, database: 'ok' });
    await app.close();
  });

  it('rejects a valid game login for a non-admin user without setting a cookie', async () => {
    const { db } = await import('../src/server/db.js');
    vi.mocked(db.execute).mockResolvedValueOnce([{ is_admin: false }]);
    const app = await buildAdminApp();
    const token = app.jwt.sign({
      id: '11111111-1111-4111-8111-111111111111',
      gamertag: 'player',
      suffix: 2,
    });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ token }) }),
    );

    const res = await app.inject({
      method: 'POST',
      url: '/admin-api/auth/login',
      payload: { email: 'player@example.com', password: 'valid-password' },
    });

    expect(res.statusCode).toBe(403);
    expect(res.headers['set-cookie']).toBeUndefined();
    await app.close();
  });
});
