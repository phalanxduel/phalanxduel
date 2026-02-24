import * as Sentry from '@sentry/node';
import { hostname } from 'node:os';
import { SCHEMA_VERSION } from '@phalanxduel/shared';

const isProduction = process.env.NODE_ENV === 'production';

const integrations = [Sentry.consoleLoggingIntegration({ levels: ['log', 'warn', 'error'] })];

if (!isProduction) {
  integrations.push(Sentry.spotlightIntegration());
}

// Try to load profiling integration if available
try {
  const { nodeProfilingIntegration } = await import('@sentry/profiling-node');
  if (nodeProfilingIntegration) {
    integrations.push(nodeProfilingIntegration());
  }
} catch {
  // Silently fail profiling if binary is missing or incompatible
}

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    release: process.env.SENTRY_RELEASE || `phalanxduel-server@${SCHEMA_VERSION}`,
    integrations,
    // Performance Monitoring
    tracesSampleRate: process.env.SENTRY_TRACES_SAMPLE_RATE
      ? parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE)
      : 1.0,
    // Profiling
    profilesSampleRate: process.env.SENTRY_PROFILES_SAMPLE_RATE
      ? parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE)
      : 1.0,
    environment: process.env.NODE_ENV || 'development',
    debug: !isProduction && !!process.env.SENTRY_DEBUG,

    initialScope: {
      tags: {
        'host.name': process.env['FLY_MACHINE_ID'] || hostname(),
        'cloud.provider': process.env['FLY_APP_NAME'] ? 'fly_io' : 'local',
        'cloud.region': process.env['FLY_REGION'] || 'unknown',
      },
    },
  });
}
