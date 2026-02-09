import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import supertest from 'supertest';
import { buildApp } from '../src/app';

describe('GET /health', () => {
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

  describe('given the server is running', () => {
    it('should return 200 with status ok', async () => {
      const response = await request.get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
    });

    it('should include a timestamp in ISO-8601 format', async () => {
      const response = await request.get('/health');

      expect(response.body).toHaveProperty('timestamp');
      expect(new Date(response.body.timestamp).toISOString()).toBe(
        response.body.timestamp,
      );
    });

    it('should include the schema version', async () => {
      const response = await request.get('/health');

      expect(response.body).toHaveProperty('version');
      expect(response.body.version).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });
});
