/**
 * System-level metrics and process tracking.
 * Aligned with Sentry Metrics and OTel Spans.
 */

import * as Sentry from '@sentry/node';

// Gauges for system state
export const matchesActive = {
  set: (val: number) => {
    if (typeof Sentry.metrics?.gauge === 'function') {
      Sentry.metrics.gauge('system.matches_active', val);
    }
  },
  add: (val: number) => {
    if (typeof Sentry.metrics?.count === 'function') {
      Sentry.metrics.count('system.matches_active', val);
    }
  },
};

export const wsConnections = {
  set: (val: number) => {
    if (typeof Sentry.metrics?.gauge === 'function') {
      Sentry.metrics.gauge('system.ws_connections', val);
    }
  },
  add: (val: number) => {
    if (typeof Sentry.metrics?.count === 'function') {
      Sentry.metrics.count('system.ws_connections', val);
    }
  },
};

// Counters for events
export const actionsTotal = {
  add: (val: number, tags?: Record<string, string>) => {
    if (typeof Sentry.metrics?.count === 'function') {
      Sentry.metrics.count('system.actions_total', val, { attributes: tags });
    }
  },
};

// Distributions for timings
export const actionsDurationMs = {
  record: (val: number) => {
    if (typeof Sentry.metrics?.distribution === 'function') {
      Sentry.metrics.distribution('system.actions_duration_ms', val);
    }
  },
};

/**
 * Track a process with an OTel span via Sentry.
 */
export async function trackProcess<T>(
  name: string,
  attributes: Record<string, string | number | boolean>,
  fn: () => Promise<T> | T,
): Promise<T> {
  return Sentry.startSpan(
    {
      name,
      attributes,
    },
    async (span) => {
      try {
        const result = await fn();
        return result;
      } catch (error) {
        span?.setStatus({
          code: 2,
          message: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },
  );
}
