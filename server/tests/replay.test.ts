import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';

const INTERNAL_TOKEN = 'test-token-abc';
const UNKNOWN_MATCH_ID = '00000000-0000-0000-0000-000000000000';

describe('GET /internal/matches/:id/replay — private admin boundary', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeAll(async () => {
    process.env.ADMIN_INTERNAL_TOKEN = INTERNAL_TOKEN;
    app = await buildApp();
  });

  afterAll(async () => {
    delete process.env.ADMIN_INTERNAL_TOKEN;
    await app.close();
  });

  it('rejects a missing bearer token', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/internal/matches/${UNKNOWN_MATCH_ID}/replay`,
    });
    expect(response.statusCode).toBe(401);
  });

  it('rejects an invalid bearer token', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/internal/matches/${UNKNOWN_MATCH_ID}/replay`,
      headers: { authorization: 'Bearer wrong-token' },
    });
    expect(response.statusCode).toBe(401);
  });

  it('accepts the internal token and reaches match lookup', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/internal/matches/${UNKNOWN_MATCH_ID}/replay`,
      headers: { authorization: `Bearer ${INTERNAL_TOKEN}` },
    });
    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ code: 'MATCH_NOT_FOUND' });
  });
});

describe('GET /matches/:matchId/replay — retired operator surface', () => {
  it('returns 410 instead of accepting legacy Basic Auth', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: `/matches/${UNKNOWN_MATCH_ID}/replay`,
    });
    expect(response.statusCode).toBe(410);
    expect(response.json()).toMatchObject({ code: 'ADMIN_SURFACE_RETIRED' });
    await app.close();
  });
});
