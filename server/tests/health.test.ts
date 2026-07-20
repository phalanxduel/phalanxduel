import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import supertest from 'supertest';
import { buildApp } from '../src/app';

describe('Health Endpoints', () => {
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

  describe('GET /health', () => {
    describe('given the server is running', () => {
      it('should return 200 with status ok', async () => {
        const response = await request.get('/health');

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('status', 'ok');
      });

      it('should include a timestamp in ISO-8601 format', async () => {
        const response = await request.get('/health');

        expect(response.body).toHaveProperty('timestamp');
        expect(new Date(response.body.timestamp).toISOString()).toBe(response.body.timestamp);
      });

      it('should include the schema version', async () => {
        const response = await request.get('/health');

        expect(response.body).toHaveProperty('version');
        // eslint-disable-next-line security/detect-unsafe-regex
        expect(response.body.version).toMatch(/^\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?$/);
      });

      it('should report OTel inactive when the SDK kill switch is enabled', async () => {
        const previousEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
        const previousDisabled = process.env.OTEL_SDK_DISABLED;

        try {
          process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'http://127.0.0.1:4318';
          process.env.OTEL_SDK_DISABLED = 'true';

          const response = await request.get('/health');

          expect(response.body.observability).toEqual(
            expect.objectContaining({ otel_active: false }),
          );
        } finally {
          if (previousEndpoint === undefined) delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
          else process.env.OTEL_EXPORTER_OTLP_ENDPOINT = previousEndpoint;

          if (previousDisabled === undefined) delete process.env.OTEL_SDK_DISABLED;
          else process.env.OTEL_SDK_DISABLED = previousDisabled;
        }
      });

      it('should report OTel active only when an endpoint is configured and the SDK is enabled', async () => {
        const previousEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
        const previousDisabled = process.env.OTEL_SDK_DISABLED;

        try {
          process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'http://127.0.0.1:4318';
          process.env.OTEL_SDK_DISABLED = 'false';

          const response = await request.get('/health');

          expect(response.body.observability).toEqual(
            expect.objectContaining({ otel_active: true }),
          );
        } finally {
          if (previousEndpoint === undefined) delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
          else process.env.OTEL_EXPORTER_OTLP_ENDPOINT = previousEndpoint;

          if (previousDisabled === undefined) delete process.env.OTEL_SDK_DISABLED;
          else process.env.OTEL_SDK_DISABLED = previousDisabled;
        }
      });

      it('should allow localhost and 127.0.0.1 local connect sources in CSP', async () => {
        const response = await request.get('/health');
        const contentSecurityPolicy = response.headers['content-security-policy'];

        expect(typeof contentSecurityPolicy).toBe('string');
        expect(contentSecurityPolicy).toContain('connect-src');
        expect(contentSecurityPolicy).toContain('ws://localhost:3001');
        expect(contentSecurityPolicy).toContain('ws://127.0.0.1:3001');
        expect(contentSecurityPolicy).toContain('http://localhost:3001');
        expect(contentSecurityPolicy).toContain('http://127.0.0.1:3001');
      });
    });
  });

  describe('GET /ready', () => {
    describe('given the server is running', () => {
      it('should return 200 or 503 based on DB availability', async () => {
        const response = await request.get('/ready');

        expect([200, 503]).toContain(response.status);
        if (response.status === 200) {
          expect(response.body).toHaveProperty('ready', true);
          expect(response.body).toHaveProperty('database', 'ok');
        } else {
          expect(response.body).toHaveProperty('ready', false);
          expect(response.body).toHaveProperty('database', 'unhealthy');
        }
      });

      it('should include a timestamp in ISO-8601 format', async () => {
        const response = await request.get('/ready');

        expect(response.body).toHaveProperty('timestamp');
        expect(new Date(response.body.timestamp).toISOString()).toBe(response.body.timestamp);
      });
    });
  });

  describe('OpenAPI spec', () => {
    it('GET /docs/json should return a valid OpenAPI spec', async () => {
      const response = await request.get('/docs/json');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('openapi');
      expect(response.body.openapi).toMatch(/^3\./);
      expect(response.body.info).toHaveProperty('title', 'Phalanx Duel Game Server');
    });

    it('OpenAPI spec should list /health, /ready and /matches endpoints', async () => {
      const response = await request.get('/docs/json');
      const paths = Object.keys(response.body.paths ?? {});

      expect(paths).toContain('/health');
      expect(paths).toContain('/ready');
      expect(paths).toContain('/matches');
      expect(paths).not.toContain('/matches/{matchId}/replay');
    });
  });

  describe('POST /matches', () => {
    it('should return 201 with a matchId', async () => {
      const response = await request.post('/matches');

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('matchId');
      expect(response.body.matchId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    });
  });
});
