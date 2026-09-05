import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('phx-client');
const clientEvents = meter.createCounter('phx.client.events', {
  description: 'Low-cardinality browser lifecycle and gameplay events.',
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
