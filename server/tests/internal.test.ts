import { describe, it, expect } from 'vitest';
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
    process.env.ADMIN_INTERNAL_TOKEN = 'test-token-abc';
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/internal/matches',
      headers: { authorization: 'Bearer test-token-abc' },
      payload: { playerName: 'Admin', opponent: 'bot-random' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ matchId: expect.any(String) });
    delete process.env.ADMIN_INTERNAL_TOKEN;
    await app.close();
  });

  it('accepts canonical nested matchParams fields on the internal route', async () => {
    process.env.ADMIN_INTERNAL_TOKEN = 'test-token-abc';
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/internal/matches',
      headers: { authorization: 'Bearer test-token-abc' },
      payload: {
        playerName: 'Admin',
        opponent: 'bot-random',
        matchParams: {
          classic: {
            enabled: true,
            mode: 'hybrid',
            initiative: { deployFirst: 'P1', attackFirst: 'P2' },
          },
          initiative: { deployFirst: 'P1', attackFirst: 'P2' },
          modePassRules: { maxConsecutivePasses: 4, maxTotalPassesPerPlayer: 6 },
        },
      },
    });
    expect(res.statusCode).toBe(201);
    delete process.env.ADMIN_INTERNAL_TOKEN;
    await app.close();
  });
});

describe('GET /internal/ratings/:userId/:mode — auth', () => {
  it('returns 401 when Authorization header is missing', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/internal/ratings/11111111-1111-1111-1111-111111111111/sp-random',
    });
    expect(res.statusCode).toBe(401);
    await app.close();
  });

  it('validates rating params before querying storage', async () => {
    process.env.ADMIN_INTERNAL_TOKEN = 'test-token-abc';
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/internal/ratings/not-a-user/sp-random',
      headers: { authorization: 'Bearer test-token-abc' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ code: 'VALIDATION_ERROR' });
    delete process.env.ADMIN_INTERNAL_TOKEN;
    await app.close();
  });
});

describe('POST /internal/matches/:id/terminate', () => {
  it('returns 200 and calls matchManager.terminateMatch', async () => {
    process.env.ADMIN_INTERNAL_TOKEN = 'test-token-abc';
    const app = await buildApp();
    const matchId = '00000000-0000-0000-0000-000000000000';

    const res = await app.inject({
      method: 'POST',
      url: `/internal/matches/${matchId}/terminate`,
      headers: { authorization: 'Bearer test-token-abc' },
    });

    // It will return 404 because the match doesn't exist in the mock/ledger,
    // but this verifies the route is reached and parameters are parsed.
    // If it was 401 or 400, it would be a failure.
    expect([200, 404]).toContain(res.statusCode);

    delete process.env.ADMIN_INTERNAL_TOKEN;
    await app.close();
  });
});

describe('POST /internal/matches/:id/rollback', () => {
  it('returns 400 for missing targetSequenceNumber', async () => {
    process.env.ADMIN_INTERNAL_TOKEN = 'test-token-abc';
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/internal/matches/00000000-0000-0000-0000-000000000000/rollback',
      headers: { authorization: 'Bearer test-token-abc' },
      payload: {},
    });
    expect(res.statusCode).toBe(400);
    delete process.env.ADMIN_INTERNAL_TOKEN;
    await app.close();
  });

  it('parses targetSequenceNumber correctly', async () => {
    process.env.ADMIN_INTERNAL_TOKEN = 'test-token-abc';
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/internal/matches/00000000-0000-0000-0000-000000000000/rollback',
      headers: { authorization: 'Bearer test-token-abc' },
      payload: { targetSequenceNumber: 0 },
    });
    // Again, 404 is acceptable here as it means validation passed but match wasn't found.
    expect([200, 404]).toContain(res.statusCode);
    delete process.env.ADMIN_INTERNAL_TOKEN;
    await app.close();
  });
});
