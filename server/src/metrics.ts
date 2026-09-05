/**
 * System-level metrics and process tracking.
 * Aligned with OpenTelemetry-native metrics and spans.
 */

import type { Attributes } from '@opentelemetry/api';
import {
  createCounter,
  createHistogram,
  createMutableGauge,
  withActiveSpan,
} from './observability.js';

const matchesActiveGauge = createMutableGauge('system.matches_active', {
  description: 'Current active matches in memory.',
});
const wsConnectionsGauge = createMutableGauge('system.ws_connections', {
  description: 'Current active WebSocket connections.',
});
const processUptimeGauge = createMutableGauge('system.process_uptime_seconds', {
  description: 'Node.js process uptime for the local game server.',
  unit: 's',
});
const actionsTotalCounter = createCounter('system.actions_total', {
  description: 'Total game actions processed by the server.',
});
const actionsDurationHistogram = createHistogram('system.actions_duration_ms', {
  description: 'Duration of processed game actions.',
  unit: 'ms',
});
const matchLifecycleCounter = createCounter('match.lifecycle', {
  description: 'Lifecycle events for matches.',
});
const matchOutcomeCounter = createCounter('game.match.outcomes', {
  description: 'Completed match outcomes by victory type and winner.',
});
const actionResultCounter = createCounter('game.action.results', {
  description: 'Accepted and rejected gameplay actions.',
});
const featureCounter = createCounter('game.feature.events', {
  description: 'Low-cardinality product feature events.',
});
const sloViolationCounter = createCounter('slo.violations', {
  description: 'Requests and gameplay operations outside their target budget.',
});
const matchDurationHistogram = createHistogram('game.match.duration_ms', {
  description: 'Wall-clock duration of completed matches.',
  unit: 'ms',
});
const turnHistogram = createHistogram('game.match.turns', {
  description: 'Number of turns in completed matches.',
});
const testCounterMetric = createCounter('test_counter', {
  description: 'Manual observability validation requests.',
});

const uptimeTimer = setInterval(() => processUptimeGauge.set(process.uptime()), 10_000);
uptimeTimer.unref?.();
processUptimeGauge.set(process.uptime());

// Gauges for system state
export const matchesActive = {
  set: (val: number) => {
    matchesActiveGauge.set(val);
  },
  add: (val: number) => {
    matchesActiveGauge.add(val);
  },
};

export const wsConnections = {
  set: (val: number) => {
    wsConnectionsGauge.set(val);
  },
  add: (val: number) => {
    wsConnectionsGauge.add(val);
  },
};

// Counters for events
export const actionsTotal = {
  add: (val: number, tags?: Attributes) => {
    actionsTotalCounter.add(val, tags);
  },
};

// Distributions for timings
export const actionsDurationMs = {
  record: (val: number) => {
    actionsDurationHistogram.record(val);
  },
};

export const matchLifecycleTotal = {
  add: (event: string, value = 1) => {
    matchLifecycleCounter.add(value, { event });
  },
};

export const actionResults = {
  add: (result: 'accepted' | 'rejected', actionType: string, errorCode?: string) => {
    actionResultCounter.add(1, {
      result,
      'action.type': actionType,
      ...(errorCode ? { 'error.code': errorCode } : {}),
    });
  },
};

export const matchOutcomes = {
  add: (winnerIndex: number | null, victoryType: string | null) => {
    matchOutcomeCounter.add(1, {
      'winner.index': winnerIndex ?? -1,
      'victory.type': victoryType ?? 'unknown',
    });
  },
};

export const matchDurationMs = {
  record: (value: number) => matchDurationHistogram.record(value),
};

export const matchTurns = {
  record: (value: number) => turnHistogram.record(value),
};

export const featureEvents = {
  add: (feature: string, event: string, attributes: Attributes = {}) => {
    featureCounter.add(1, { feature, event, ...attributes });
  },
};

export const sloViolations = {
  add: (slo: string, operation: string, attributes: Attributes = {}) => {
    sloViolationCounter.add(1, { slo, operation, ...attributes });
  },
};

export const testCounter = {
  add: (value = 1) => {
    testCounterMetric.add(value);
  },
};

/**
 * Track a process with an active OpenTelemetry span.
 */
export async function trackProcess<T>(
  name: string,
  attributes: Attributes,
  fn: () => Promise<T> | T,
): Promise<T> {
  return withActiveSpan(name, { attributes }, () => fn());
}
