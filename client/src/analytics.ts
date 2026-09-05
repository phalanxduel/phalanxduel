import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('phx-client');
const clientEvents = meter.createCounter('phx.client.events', {
  description: 'Low-cardinality browser lifecycle and gameplay events.',
});
const featureEvents = meter.createCounter('phx.client.feature_events', {
  description: 'Product feature interactions observed in the browser.',
});
const actionLatency = meter.createHistogram('phx.client.action_latency_ms', {
  description: 'Time from a browser action submission to its acknowledgement.',
  unit: 'ms',
});
const webVitals = meter.createHistogram('phx.client.web_vitals', {
  description: 'Browser experience measurements such as LCP and INP.',
  unit: 'ms',
});

/**
 * Capture a client-side behavioral event.
 * Routes to OpenTelemetry metrics (counter).
 */
export function trackClientEvent(
  event: string,
  attributes?: Record<string, string | number | boolean>,
): void {
  try {
    clientEvents.add(1, {
      event,
      ...attributes,
    });
  } catch {
    // Fail silently
  }
}

export function trackFeatureEvent(
  feature: string,
  event: string,
  attributes?: Record<string, string | number | boolean>,
): void {
  try {
    featureEvents.add(1, { feature, event, ...attributes });
  } catch {
    // Fail silently; telemetry must never affect playability.
  }
}

export function recordClientActionLatency(
  valueMs: number,
  attributes?: Record<string, string | number | boolean>,
): void {
  try {
    actionLatency.record(valueMs, attributes);
  } catch {
    // Fail silently.
  }
}

export function recordWebVital(
  name: string,
  valueMs: number,
  attributes?: Record<string, string | number | boolean>,
): void {
  try {
    webVitals.record(valueMs, { name, ...attributes });
  } catch {
    // Fail silently.
  }
}
