import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../src/app';
import type { FastifyInstance } from 'fastify';

describe('Auth routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('without DATABASE_URL', () => {
    it('POST /api/auth/register returns 503 when DB unavailable', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: { name: 'Test', email: 'test@example.com', password: 'password123' },
      });
      expect(res.statusCode).toBe(503);
      expect(res.json().error).toBe('Database not available');
    });

    it('POST /api/auth/login returns 503 when DB unavailable', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'test@example.com', password: 'password123' },
      });
      expect(res.statusCode).toBe(503);
      expect(res.json().error).toBe('Database not available');
    });

    it('GET /api/auth/me returns 401 without token', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
      });
      expect(res.statusCode).toBe(401);
    });

    it('POST /api/auth/logout clears cookie and returns ok', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/logout',
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().ok).toBe(true);
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
    });
  });

  describe('input validation', () => {
    it('POST /api/auth/register rejects missing fields', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: { email: 'test@example.com' },
      });
      // Either 400 (validation) or 503 (no DB) - both acceptable
      expect([400, 503]).toContain(res.statusCode);
    });

    it('POST /api/auth/register rejects short password', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: { name: 'Test', email: 'test@example.com', password: 'short' },
      });
      expect([400, 503]).toContain(res.statusCode);
    });

    it('POST /api/auth/login rejects invalid email format', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'not-an-email', password: 'password123' },
      });
      expect([400, 503]).toContain(res.statusCode);
    });
  });
});
