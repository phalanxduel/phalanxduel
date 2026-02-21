import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import supertest from 'supertest';
import { buildApp } from '../src/app';

const VALID_CREDENTIALS = Buffer.from('phalanx:phalanx').toString('base64');
const WRONG_CREDENTIALS = Buffer.from('admin:wrongpassword').toString('base64');
const UNKNOWN_MATCH_ID = '00000000-0000-0000-0000-000000000000';

describe('GET /matches/:matchId/replay — Basic Auth', () => {
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
    it('should return 401 with UNAUTHORIZED code', async () => {
      const response = await request.get(`/matches/${UNKNOWN_MATCH_ID}/replay`);

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        error: 'Unauthorized',
        code: 'UNAUTHORIZED',
      });
    });

    it('should include a WWW-Authenticate header', async () => {
      const response = await request.get(`/matches/${UNKNOWN_MATCH_ID}/replay`);

      expect(response.headers['www-authenticate']).toBe('Basic realm="Phalanx Duel Admin"');
    });
  });

  describe('given wrong credentials', () => {
    it('should return 401', async () => {
      const response = await request
        .get(`/matches/${UNKNOWN_MATCH_ID}/replay`)
        .set('Authorization', `Basic ${WRONG_CREDENTIALS}`);

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        error: 'Unauthorized',
        code: 'UNAUTHORIZED',
      });
    });
  });

  describe('given a non-Basic Authorization scheme', () => {
    it('should return 401', async () => {
      const response = await request
        .get(`/matches/${UNKNOWN_MATCH_ID}/replay`)
        .set('Authorization', 'Bearer sometoken');

      expect(response.status).toBe(401);
    });
  });

  describe('given correct credentials', () => {
    it('should pass auth and return 404 for unknown matchId', async () => {
      // When auth passes, the handler proceeds to match lookup.
      // An unknown matchId returns 404 — confirming auth was accepted.
      const response = await request
        .get(`/matches/${UNKNOWN_MATCH_ID}/replay`)
        .set('Authorization', `Basic ${VALID_CREDENTIALS}`);

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        error: 'Match not found',
        code: 'MATCH_NOT_FOUND',
      });
    });
  });
});
