import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import supertest from 'supertest';
import { buildApp } from '../src/app';
import { type IMatchManager } from '../src/match';
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

    const events = response.body.events as { name: string }[];
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

    const compact = response.body as { seq: number; type: string }[];
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

  it('HTML response contains event grid structure', async () => {
    const response = await request.get(`/matches/${matchId}/log`).set('Accept', 'text/html');

    expect(response.text).toContain('event-row');
    expect(response.text).toContain('col-header');
    expect(response.text).toContain('match.created');
  });
});

describe('GET /matches/:id/log — participant authorization boundaries', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let request: ReturnType<typeof supertest>;
  let matchManager: IMatchManager;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
    request = supertest(app.server);
    // @ts-expect-error test access to shared match manager
    matchManager = app.matchManager;
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns the unredacted completed log to an anonymous participant presenting the correct player id', async () => {
    const { matchId, playerId } = matchManager.createMatch('Alice', null);
    await matchManager.joinMatch(matchId, 'Bob', null);
    await matchManager.handleAction(matchId, playerId, {
      type: 'forfeit',
      playerIndex: 0,
      timestamp: new Date().toISOString(),
    });

    const response = await request
      .get(`/matches/${matchId}/log`)
      .set('x-phalanx-player-id', playerId);

    expect(response.status).toBe(200);
    expect(
      response.body.events.some((event: { name: string }) => event.name === 'game.completed'),
    ).toBe(true);
  });

  it('does not let an authenticated user borrow another player id header for completed log access', async () => {
    const aliceUserId = '55555555-5555-5555-5555-555555555555';
    const bobUserId = '66666666-6666-6666-6666-666666666666';
    const { matchId } = matchManager.createMatch('Alice', null, { userId: aliceUserId });
    const { playerId: bobPlayerId } = await matchManager.joinMatch(matchId, 'Bob', null, bobUserId);
    // @ts-expect-error test access to Fastify JWT helper
    const outsiderToken = app.jwt.sign({ id: '77777777-7777-7777-7777-777777777777' });
    await matchManager.handleAction(matchId, bobPlayerId, {
      type: 'forfeit',
      playerIndex: 1,
      timestamp: new Date().toISOString(),
    });

    const response = await request
      .get(`/matches/${matchId}/log`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .set('x-phalanx-player-id', bobPlayerId);
    const publicResponse = await request.get(`/matches/${matchId}/log`);

    expect(response.status).toBe(200);
    expect({ ...response.body, generatedAt: undefined }).toEqual({
      ...publicResponse.body,
      generatedAt: undefined,
    });
  });
});
