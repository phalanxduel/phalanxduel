import * as Sentry from '@sentry/browser';

export function trackClientEvent(
  event: string,
  attributes?: Record<string, string | number | boolean>,
): void {
  if (typeof Sentry.metrics.count !== 'function') return;

  Sentry.metrics.count('client.event', 1, {
    attributes: {
      event,
      ...attributes,
    },
  });
}
