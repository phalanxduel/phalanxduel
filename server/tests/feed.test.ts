import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import supertest from 'supertest';
import { buildApp } from '../src/app';

const VALID_CREDENTIALS = Buffer.from('phalanx:phalanx').toString('base64');
const WRONG_CREDENTIALS = Buffer.from('admin:wrongpassword').toString('base64');
const originalAbTestsJson = process.env.PHALANX_AB_TESTS_JSON;

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

      const entry = response.body.find((m: { matchId: string }) => m.matchId === matchId);
      expect(entry).toBeDefined();
    });

    it('should have the correct shape for a waiting match', async () => {
      const response = await request.get('/matches');
      const entry = response.body.find((m: { matchId: string }) => m.matchId === matchId);

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
      const entry = response.body.find((m: { matchId: string }) => m.matchId === matchId);

      expect(entry.phase).toBeNull();
    });
  });
});

describe('GET /admin — Basic Auth HTML dashboard', () => {
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

  describe('given no Authorization header', () => {
    it('should return 401', async () => {
      const response = await request.get('/admin');

      expect(response.status).toBe(401);
    });

    it('should include a WWW-Authenticate header', async () => {
      const response = await request.get('/admin');

      expect(response.headers['www-authenticate']).toBe('Basic realm="Phalanx Duel Admin"');
    });
  });

  describe('given wrong credentials', () => {
    it('should return 401', async () => {
      const response = await request
        .get('/admin')
        .set('Authorization', `Basic ${WRONG_CREDENTIALS}`);

      expect(response.status).toBe(401);
    });
  });

  describe('given correct credentials', () => {
    it('should return 200 with text/html content type', async () => {
      const response = await request
        .get('/admin')
        .set('Authorization', `Basic ${VALID_CREDENTIALS}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/text\/html/);
    });

    it('should return a page containing "Phalanx Duel Admin"', async () => {
      const response = await request
        .get('/admin')
        .set('Authorization', `Basic ${VALID_CREDENTIALS}`);

      expect(response.text).toContain('Phalanx Duel Admin');
    });

    it('should include an A/B tests section', async () => {
      const response = await request
        .get('/admin')
        .set('Authorization', `Basic ${VALID_CREDENTIALS}`);

      expect(response.text).toContain('A/B Tests');
      expect(response.text).toContain('ab-tests-container');
      expect(response.text).toContain('/admin/ab-tests');
    });
  });
});

describe('GET /admin/ab-tests — Basic Auth JSON A/B snapshot', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let request: ReturnType<typeof supertest>;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
    request = supertest(app.server);
  });

  afterAll(async () => {
    await app.close();
    if (originalAbTestsJson === undefined) {
      delete process.env.PHALANX_AB_TESTS_JSON;
      return;
    }
    process.env.PHALANX_AB_TESTS_JSON = originalAbTestsJson;
  });

  it('returns 401 without credentials', async () => {
    const response = await request.get('/admin/ab-tests');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
  });

  it('returns normalized tests and warnings with valid credentials', async () => {
    process.env.PHALANX_AB_TESTS_JSON = JSON.stringify([
      {
        id: 'lobby_framework',
        description: 'Preact lobby rollout',
        variants: { control: 90, preact: 10 },
      },
      {
        id: 'matchmaking_v2',
        variants: {
          control: 50,
          variant: 40,
        },
      },
    ]);

    const response = await request
      .get('/admin/ab-tests')
      .set('Authorization', `Basic ${VALID_CREDENTIALS}`);

    expect(response.status).toBe(200);
    expect(response.body.tests).toEqual([
      {
        id: 'lobby_framework',
        description: 'Preact lobby rollout',
        variants: [
          { name: 'control', ratio: 90 },
          { name: 'preact', ratio: 10 },
        ],
        totalRatio: 100,
      },
      {
        id: 'matchmaking_v2',
        description: null,
        variants: [
          { name: 'control', ratio: 50 },
          { name: 'variant', ratio: 40 },
        ],
        totalRatio: 90,
      },
    ]);
    expect(response.body.warnings).toContain(
      'Entry "matchmaking_v2": ratio total is 90 (expected 100)',
    );
  });
});
