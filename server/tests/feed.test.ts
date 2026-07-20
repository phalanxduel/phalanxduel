import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import supertest from 'supertest';
import { buildApp } from '../src/app';
import { client } from '../src/db/index.js';

describe('GET /matches — public feed', () => {
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

  describe('given no matches exist', () => {
    beforeAll(async () => {
      // Truncate after app.ready() so late async DB writes from previous test
      // files have settled before we assert on the empty state.
      if (client) await client`TRUNCATE matches CASCADE`;
    });

    it('should return 200 with an empty array', async () => {
      const response = await request.get('/matches');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });
  });

  describe('given a match slot created via POST /matches', () => {
    let matchId: string;

    beforeAll(async () => {
      const res = await request.post('/matches');
      matchId = res.body.matchId as string;
    });

    it('should return 200 with the match in the feed', async () => {
      const response = await request.get('/matches');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(1);

      const entry = response.body.find((match: { matchId: string }) => match.matchId === matchId);
      expect(entry).toBeDefined();
    });

    it('should have the correct shape for a waiting match', async () => {
      const response = await request.get('/matches');
      const entry = response.body.find((match: { matchId: string }) => match.matchId === matchId);

      expect(entry).toMatchObject({
        matchId,
        players: [],
        spectatorCount: 0,
        phase: null,
        turnNumber: null,
      });
      expect(typeof entry.ageSeconds).toBe('number');
      expect(entry.ageSeconds).toBeGreaterThanOrEqual(0);
      expect(typeof entry.lastActivitySeconds).toBe('number');
      expect(entry.lastActivitySeconds).toBeGreaterThanOrEqual(0);
    });

    it('phase should be null when no players have connected via WS', async () => {
      const response = await request.get('/matches');
      const entry = response.body.find((match: { matchId: string }) => match.matchId === matchId);

      expect(entry.phase).toBeNull();
    });
  });
});

describe('retired game-server admin surfaces', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it.each(['/admin', '/admin/ab-tests'])(
    'returns 410 for %s without accepting legacy credentials',
    async (url) => {
      const response = await app.inject({ method: 'GET', url });
      expect(response.statusCode).toBe(410);
      expect(response.json()).toMatchObject({ code: 'ADMIN_SURFACE_RETIRED' });
    },
  );
});
