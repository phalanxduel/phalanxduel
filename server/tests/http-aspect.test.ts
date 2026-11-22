import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';
import { withRouteAspect } from '../src/http-aspect.js';

describe('withRouteAspect', () => {
  it('wraps handlers in tracing and returns handler output when guards are not required', async () => {
    const app = Fastify();
    app.get(
      '/ping',
      withRouteAspect({ operation: 'test.ping' }, ({ span }) => {
        expect(span).toBeDefined();
        return { ok: true };
      }),
    );

    const res = await app.inject({ method: 'GET', url: '/ping' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
    await app.close();
  });

  it('fails closed with 401 UNAUTHORIZED when requireAuth is enabled without credentials', async () => {
    const app = Fastify();
    app.get(
      '/protected',
      withRouteAspect({ operation: 'test.protected', requireAuth: true }, () => ({ ok: true })),
    );

    const res = await app.inject({ method: 'GET', url: '/protected' });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
    await app.close();
  });
});
