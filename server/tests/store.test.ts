import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';

describe('Cosmetic Store & Entitlements API', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp({ logger: false });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/store/products returns active cosmetic catalog', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/store/products',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.products)).toBe(true);
    expect(body.products.length).toBeGreaterThan(0);
    expect(body.products[0]).toHaveProperty('sku');
    expect(body.products[0]).toHaveProperty('priceCents');
  });

  it('POST /api/store/verify-purchase validates purchase receipt', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/store/verify-purchase',
      payload: {
        userId: '00000000-0000-0000-0000-000000000001',
        productId: 'd8a6e8b2-4f3c-4a1b-9e2a-7c3f8e1b2a3c',
        transactionId: 'test_tx_' + Date.now(),
        platform: 'ios',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.granted).toBe(true);
    expect(body.entitlement).toBeDefined();
  });

  it('GET /api/store/inventory returns player entitlements', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/store/inventory?userId=00000000-0000-0000-0000-000000000001',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.userId).toBe('00000000-0000-0000-0000-000000000001');
    expect(Array.isArray(body.entitlements)).toBe(true);
  });

  it('POST /api/store/create-checkout-session returns simulation when STRIPE_SECRET_KEY is unset', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/store/create-checkout-session',
      payload: {
        userId: '00000000-0000-0000-0000-000000000001',
        productId: 'com.phalanxduel.supporter_pass_v1',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.mode).toBe('simulation');
    expect(body.sessionId).toMatch(/^cs_test_/);
  });

  it('POST /api/store/create-checkout-session rejects missing params', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/store/create-checkout-session',
      payload: {},
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.code).toBe('MISSING_PARAMS');
  });

  it('POST /api/store/stripe-webhook acknowledges checkout.session.completed', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/store/stripe-webhook',
      payload: {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_webhook_' + Date.now(),
            metadata: {
              userId: '00000000-0000-0000-0000-000000000001',
              productId: 'com.phalanxduel.supporter_pass_v1',
            },
          },
        },
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.received).toBe(true);
  });

  it('POST /api/store/stripe-webhook acknowledges unknown event types', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/store/stripe-webhook',
      payload: {
        type: 'payment_intent.created',
        data: { object: { id: 'pi_test' } },
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.received).toBe(true);
  });
});
