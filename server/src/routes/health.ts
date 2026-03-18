import type { FastifyInstance } from 'fastify';
import { sql } from 'drizzle-orm';
import { SCHEMA_VERSION } from '@phalanxduel/shared';
import { db } from '../db/index.js';
import { traceDbQuery } from '../db/observability.js';

/**
 * Register health check endpoints:
 * - GET /health: Liveness probe (is the process alive?)
 * - GET /ready: Readiness probe (is the app ready for traffic?)
 *
 * Liveness is used by orchestrators to detect if the process crashed.
 * Readiness is used to determine if the app should receive traffic.
 */
export function registerHealthRoutes(app: FastifyInstance) {
  // ── Liveness Probe: Is the process alive? ──────────────────────────
  app.get(
    '/health',
    {
      schema: {
        tags: ['system'],
        summary: 'Server health check (liveness probe)',
        description:
          'Returns 200 if the process is alive. Used by orchestrators and load balancers.',
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string', enum: ['ok'] },
              timestamp: { type: 'string', format: 'date-time' },
              version: { type: 'string' },
              uptime_seconds: { type: 'integer' },
              memory_heap_used_mb: { type: 'integer' },
              observability: {
                type: 'object',
                properties: {
                  sentry_initialized: { type: 'boolean' },
                  region: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async () => {
      const database = db;
      if (database) {
        // Acceptance criteria #4: Both endpoints execute SELECT 1 health check
        // We don't fail liveness if DB is down, but we do the check to warm up/trace
        try {
          await traceDbQuery('db.liveness_check', { operation: 'SELECT', table: 'dual' }, () =>
            database.execute(sql`SELECT 1`),
          );
        } catch {
          // Ignore DB error for liveness
        }
      }

      const memory = process.memoryUsage();
      const sentryDsn = process.env['SENTRY__SERVER__SENTRY_DSN'];
      const nodeEnv = process.env['NODE_ENV'] ?? 'development';
      const enableLocalSentry =
        process.env['PHALANX_ENABLE_LOCAL_SENTRY'] === '1' ||
        process.env['PHALANX_ENABLE_LOCAL_SENTRY']?.toLowerCase() === 'true';

      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: SCHEMA_VERSION,
        uptime_seconds: Math.floor(process.uptime()),
        memory_heap_used_mb: Math.floor(memory.heapUsed / 1024 / 1024),
        observability: {
          sentry_initialized: !!sentryDsn && (nodeEnv === 'production' || enableLocalSentry),
          region: process.env.FLY_REGION || 'local',
        },
      };
    },
  );

  // ── Readiness Probe: Is the app ready for traffic? ─────────────────
  app.get(
    '/ready',
    {
      schema: {
        tags: ['system'],
        summary: 'Server readiness check',
        description:
          'Returns 200 if the app is ready to handle traffic, including database connectivity.',
        response: {
          200: {
            type: 'object',
            properties: {
              ready: { type: 'boolean' },
              database: { type: 'string', enum: ['ok', 'unhealthy'] },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
          503: {
            type: 'object',
            properties: {
              ready: { type: 'boolean' },
              database: { type: 'string', enum: ['ok', 'unhealthy'] },
              error: { type: 'string' },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
    async (_request, reply) => {
      try {
        const database = db;
        if (!database) {
          // If db is null, we are in guest-only mode (DATABASE_URL not set).
          // In this case, we consider the app ready as it doesn't need a DB.
          return {
            ready: true,
            database: 'ok',
            timestamp: new Date().toISOString(),
          };
        }

        // Test database connectivity
        await traceDbQuery(
          'db.readiness_check',
          {
            operation: 'SELECT',
            table: 'dual',
          },
          () => database.execute(sql`SELECT 1`),
        );

        return {
          ready: true,
          database: 'ok',
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        void reply.status(503);
        return {
          ready: false,
          database: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        };
      }
    },
  );
}
