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

      // JSON Schema defines `type` arrays as sets; generators may emit nullable
      // types in different orders across compatible dependency updates.
      const normalizeTypeOrder = (value: unknown): void => {
        if (Array.isArray(value)) {
          value.forEach(normalizeTypeOrder);
          return;
        }
        if (typeof value !== 'object' || value === null) return;
        const record = value as Record<string, unknown>;
        if (Array.isArray(record.type)) record.type.sort();
        Object.values(record).forEach(normalizeTypeOrder);
      };
      normalizeTypeOrder(spec);

      // Stabilize dynamic environment/version fields so the snapshot only guards API shape.
      if (spec.servers) {
        spec.servers = [{ url: 'http://127.0.0.1:3001' }];
      }
      if (spec.info?.version) {
        spec.info.version = '<redacted-version>';
      }

      // This will fail if the API structure changes, forcing a snapshot update.
      expect(spec).toMatchSnapshot();
    } finally {
      await app.close();
    }
  }, 20_000);
});
