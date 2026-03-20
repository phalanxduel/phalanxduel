import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildAdminApp } from '../../src/server/index.js';

vi.mock('../../src/server/middleware/auth.js', () => ({
  requireAdmin: vi.fn().mockResolvedValue({ id: 'admin-id', gamertag: 'admin', suffix: 1 }),
}));
vi.mock('../../src/server/db.js', () => ({
  db: { execute: vi.fn().mockResolvedValue([]) },
}));

describe('PATCH /admin-api/users/:userId/admin', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 400 when actor tries to modify their own admin flag', async () => {
    const app = await buildAdminApp();
    const res = await app.inject({
      method: 'PATCH',
      url: '/admin-api/users/admin-id/admin',
      payload: { isAdmin: false },
    });
    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.code).toBe('SELF_REVOCATION_FORBIDDEN');
    await app.close();
  });
});
