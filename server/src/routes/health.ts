import type { FastifyInstance } from 'fastify';
import { SCHEMA_VERSION } from '@phalanxduel/shared';

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
      const memory = process.memoryUsage();
      const sentryDsn = process.env['SENTRY__SERVER__SENTRY_DSN'];
      const nodeEnv = process.env['NODE_ENV'] ?? 'development';
      const enableLocalSentry = process.env['PHALANX_ENABLE_LOCAL_SENTRY'] === '1' ||
        process.env['PHALANX_ENABLE_LOCAL_SENTRY']?.toLowerCase() === 'true';

      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: SCHEMA_VERSION,
        uptime_seconds: Math.floor(process.uptime()),
        memory_heap_used_mb: Math.floor(memory.heapUsed / 1024 / 1024),
        observability: {
          sentry_initialized:
            !!sentryDsn && (nodeEnv === 'production' || enableLocalSentry),
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
          'Returns 200 if the app is ready to handle traffic. For now, always returns ready.',
        response: {
          200: {
            type: 'object',
            properties: {
              ready: { type: 'boolean' },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
    async () => {
      // Note: Database connectivity check can be added here when DB is available
      // For now, readiness is based on the process being alive
      return {
        ready: true,
        timestamp: new Date().toISOString(),
      };
    },
  );
}
