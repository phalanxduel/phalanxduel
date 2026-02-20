import { expect, it, describe } from 'vitest';
import { buildApp } from '../src/app.js';

describe('OpenAPI Contract', () => {
  it('should match the snapshot of the generated OpenAPI spec', async () => {
    const app = await buildApp();
    
    // Wait for Fastify to be ready (Swagger generation happens on ready)
    await app.ready();
    
    const response = await app.inject({
      method: 'GET',
      url: '/docs/json',
    });

    expect(response.statusCode).toBe(200);
    
    const spec = JSON.parse(response.body);
    
    // Stabilize the spec by removing dynamic servers/host info if present
    if (spec.servers) {
      spec.servers = [{ url: 'http://localhost:3001' }];
    }

    // This will fail if the API structure changes, forcing a snapshot update
    expect(spec).toMatchSnapshot();
    
    await app.close();
  });
});
