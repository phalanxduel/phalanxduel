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

describe('OpenAPI spec', () => {
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

  it('GET /docs/json should return a valid OpenAPI spec', async () => {
    const response = await request.get('/docs/json');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('openapi');
    expect(response.body.openapi).toMatch(/^3\./);
    expect(response.body.info).toHaveProperty('title', 'Phalanx Game Server');
  });

  it('OpenAPI spec should list /health and /matches endpoints', async () => {
    const response = await request.get('/docs/json');
    const paths = Object.keys(response.body.paths ?? {});

    expect(paths).toContain('/health');
    expect(paths).toContain('/matches');
    expect(paths).toContain('/matches/{matchId}/replay');
  });
});

describe('POST /matches', () => {
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

  it('should return 201 with a matchId', async () => {
    const response = await request.post('/matches');

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('matchId');
    expect(response.body.matchId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });
});
