import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import supertest from 'supertest';
import { buildApp } from '../src/app';
import { computeStateHash } from '@phalanxduel/shared/hash';

describe('GET /matches/completed', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let request: ReturnType<typeof supertest>;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
    request = supertest(app.server);
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 200 with an empty array when no database is configured', async () => {
    const response = await request.get('/matches/completed');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body).toHaveLength(0);
  });

  it('returns 200 with an empty array for ?page=2&limit=5 when no DB', async () => {
    const response = await request.get('/matches/completed?page=2&limit=5');

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(0);
  });
});

describe('GET /matches/:id/log — 404 for unknown match', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let request: ReturnType<typeof supertest>;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
    request = supertest(app.server);
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 404 for an unknown match ID', async () => {
    const response = await request.get('/matches/00000000-0000-0000-0000-000000000099/log');

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({ error: 'Match log not found', code: 'LOG_NOT_FOUND' });
  });

  it('returns 404 for compact format with an unknown match', async () => {
    const response = await request.get(
      '/matches/00000000-0000-0000-0000-000000000099/log?format=compact',
    );

    expect(response.status).toBe(404);
  });
});

describe('GET /matches/:id/log — full JSON for in-memory match', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let request: ReturnType<typeof supertest>;
  let matchId: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
    request = supertest(app.server);

    // Create a match via POST /matches so it exists in-memory on the matchManager
    const createRes = await request.post('/matches');
    matchId = createRes.body.matchId as string;
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 200 with full MatchEventLog JSON for an in-memory match', async () => {
    const response = await request.get(`/matches/${matchId}/log`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('matchId', matchId);
    expect(response.body).toHaveProperty('events');
    expect(response.body).toHaveProperty('fingerprint');
    expect(response.body).toHaveProperty('generatedAt');
    expect(Array.isArray(response.body.events)).toBe(true);
  });

  it('fingerprint in response is verifiable against the events array', async () => {
    const response = await request.get(`/matches/${matchId}/log`);

    expect(response.status).toBe(200);
    const { fingerprint, events } = response.body as { fingerprint: string; events: unknown[] };
    expect(computeStateHash(events)).toBe(fingerprint);
  });

  it('fingerprint is a 64-char SHA-256 hex string', async () => {
    const response = await request.get(`/matches/${matchId}/log`);

    expect(response.body.fingerprint).toMatch(/^[0-9a-f]{64}$/);
  });

  it('generatedAt is a valid ISO timestamp', async () => {
    const response = await request.get(`/matches/${matchId}/log`);

    const { generatedAt } = response.body as { generatedAt: string };
    expect(new Date(generatedAt).toISOString()).toBe(generatedAt);
  });

  it('events array contains at least match.created lifecycle event', async () => {
    const response = await request.get(`/matches/${matchId}/log`);

    const events = response.body.events as Array<{ name: string }>;
    expect(events.length).toBeGreaterThan(0);
    expect(events[0]!.name).toBe('match.created');
  });
});

describe('GET /matches/:id/log?format=compact', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let request: ReturnType<typeof supertest>;
  let matchId: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
    request = supertest(app.server);

    const createRes = await request.post('/matches');
    matchId = createRes.body.matchId as string;
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 200 with a compact array', async () => {
    const response = await request.get(`/matches/${matchId}/log?format=compact`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it('compact events have seq and type fields', async () => {
    const response = await request.get(`/matches/${matchId}/log?format=compact`);

    const compact = response.body as Array<{ seq: number; type: string }>;
    expect(compact.length).toBeGreaterThan(0);
    expect(compact[0]).toHaveProperty('seq', 0);
    expect(compact[0]).toHaveProperty('type');
    expect(typeof compact[0]!.type).toBe('string');
  });

  it('compact format has fewer total characters than full JSON', async () => {
    const [fullRes, compactRes] = await Promise.all([
      request.get(`/matches/${matchId}/log`),
      request.get(`/matches/${matchId}/log?format=compact`),
    ]);

    const fullLen = JSON.stringify(fullRes.body).length;
    const compactLen = JSON.stringify(compactRes.body).length;
    // Compact should be smaller than full log (no id/parentId/status/type fields)
    expect(compactLen).toBeLessThan(fullLen);
  });
});

describe('GET /matches/:id/log — HTML response', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let request: ReturnType<typeof supertest>;
  let matchId: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
    request = supertest(app.server);

    const createRes = await request.post('/matches');
    matchId = createRes.body.matchId as string;
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns text/html when Accept: text/html', async () => {
    const response = await request.get(`/matches/${matchId}/log`).set('Accept', 'text/html');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/text\/html/);
  });

  it('HTML response contains match ID', async () => {
    const response = await request.get(`/matches/${matchId}/log`).set('Accept', 'text/html');

    expect(response.text).toContain(matchId);
  });

  it('HTML response contains event table structure', async () => {
    const response = await request.get(`/matches/${matchId}/log`).set('Accept', 'text/html');

    expect(response.text).toContain('<table>');
    expect(response.text).toContain('<tbody>');
    expect(response.text).toContain('match.created');
  });
});
