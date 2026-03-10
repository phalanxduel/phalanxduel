import type { Span } from '@opentelemetry/api';
import { withActiveSpan } from './observability.js';

/**
 * Wraps a WebSocket message handler in an OpenTelemetry span.
 * Use this for every inbound WS message to get consistent tracing.
 *
 * Required span attributes (set automatically or by caller):
 *   - match.id
 *   - player.id
 *   - action.type
 *
 * See docs/OBSERVABILITY.md for the full attribute contract.
 */
export function traceWsMessage<T>(
  messageType: string,
  attributes: Record<string, string>,
  handler: (span: Span) => Promise<T> | T,
): Promise<T> {
  return withActiveSpan(`ws.${messageType}`, { attributes }, handler);
}

/**
 * Creates a named span for an HTTP handler. HTTP instrumentation auto-creates
 * spans for requests, but use this for custom sub-spans inside handlers.
 */
export function traceHttpHandler<T>(
  operationName: string,
  handler: (span: Span) => Promise<T> | T,
): Promise<T> {
  return withActiveSpan(`http.${operationName}`, {}, handler);
}
