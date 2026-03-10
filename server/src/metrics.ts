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
const testCounterMetric = createCounter('test_counter', {
  description: 'Manual observability validation requests.',
});

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
