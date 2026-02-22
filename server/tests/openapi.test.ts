import { expect, it, describe } from 'vitest';
import { buildApp } from '../src/app.js';

describe('OpenAPI Contract', () => {
  it('should match the snapshot of the generated OpenAPI spec', async () => {
    const app = await buildApp();

    try {
      // Wait for Fastify to be ready (Swagger generation happens on ready)
      await app.ready();

      const response = await app.inject({
        method: 'GET',
        url: '/docs/json',
      });

      expect(response.statusCode).toBe(200);

      const spec = JSON.parse(response.body);

      // Stabilize dynamic environment/version fields so the snapshot only guards API shape.
      if (spec.servers) {
        spec.servers = [{ url: 'http://localhost:3001' }];
      }
      if (spec.info?.version) {
        spec.info.version = '<redacted-version>';
      }

      // This will fail if the API structure changes, forcing a snapshot update.
      expect(spec).toMatchSnapshot();
    } finally {
      await app.close();
    }
  });
});
