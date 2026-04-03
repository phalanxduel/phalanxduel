/**
 * Copyright © 2026 Mike Hall
 * Licensed under the GNU General Public License v3.0.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import supertest from 'supertest';
import { buildApp } from '../src/app';

describe('GET /api/defaults', () => {
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

  it('returns 200 with default match parameters', async () => {
    const response = await request.get('/api/defaults');
    expect(response.status).toBe(200);

    const { body } = response;
    expect(body.rows).toBe(2);
    expect(body.columns).toBe(4);
    expect(body.maxHandSize).toBe(4);
    expect(body.initialDraw).toBe(12);
    expect(body.startingLifepoints).toBe(20);
  });

  it('includes _meta with constraints', async () => {
    const response = await request.get('/api/defaults');
    const { body } = response;
    expect(body._meta).toBeDefined();
    expect(body._meta.versions.schemaVersion).toBeDefined();
    expect(body._meta.versions.specVersion).toBe(body.specVersion);
    expect(body._meta.constraints.rows.min).toBe(1);
    expect(body._meta.constraints.rows.max).toBe(12);
    expect(body._meta.constraints.columns.max).toBe(12);
  });

  it('documents which version identifier external clients should use for each compatibility check', async () => {
    const response = await request.get('/api/defaults');
    expect(response.body._meta.versions.compatibility.wireFormat).toContain('schemaVersion');
    expect(response.body._meta.versions.compatibility.gameplay).toContain('specVersion');
  });

  it('totalSlots constraint matches RULES.md § 3.3 (max 48)', async () => {
    const response = await request.get('/api/defaults');
    expect(response.body._meta.constraints.totalSlots.note).toBe('rows * columns <= 48');
  });
});
