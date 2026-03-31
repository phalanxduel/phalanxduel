import { metrics } from '@opentelemetry/api';

/**
 * Capture a client-side behavioral event.
 * Routes to OpenTelemetry metrics (counter).
 */
export function trackClientEvent(
  event: string,
  attributes?: Record<string, string | number | boolean>,
): void {
  try {
    const meter = metrics.getMeter('phx-client');
    const counter = meter.createCounter('phx.client.event');
    counter.add(1, {
      event,
      ...attributes,
    });
  } catch {
    // Fail silently
  }
}
