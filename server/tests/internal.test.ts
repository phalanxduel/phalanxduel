import { describe, it, expect, beforeEach } from 'vitest';
import { buildApp } from '../src/app.js';

describe('POST /internal/matches — auth', () => {
  it('returns 401 when Authorization header is missing', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/internal/matches',
      payload: { playerName: 'Admin', opponent: 'bot-random' },
    });
    expect(res.statusCode).toBe(401);
    await app.close();
  });

  it('returns 401 when token is wrong', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/internal/matches',
      headers: { authorization: 'Bearer wrong-token' },
      payload: { playerName: 'Admin', opponent: 'bot-random' },
    });
    expect(res.statusCode).toBe(401);
    await app.close();
  });

  it('returns 201 with matchId when ADMIN_INTERNAL_TOKEN is correct', async () => {
    process.env['ADMIN_INTERNAL_TOKEN'] = 'test-token-abc';
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/internal/matches',
      headers: { authorization: 'Bearer test-token-abc' },
      payload: { playerName: 'Admin', opponent: 'bot-random' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ matchId: expect.any(String) });
    delete process.env['ADMIN_INTERNAL_TOKEN'];
    await app.close();
  });
});
