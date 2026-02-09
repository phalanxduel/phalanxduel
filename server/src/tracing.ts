import { trace, type Span, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('phalanx-server');

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
  handler: (span: Span) => T,
): T {
  return tracer.startActiveSpan(`ws.${messageType}`, (span) => {
    try {
      for (const [key, value] of Object.entries(attributes)) {
        span.setAttribute(key, value);
      }
      const result = handler(span);
      span.end();
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error),
      });
      span.end();
      throw error;
    }
  });
}

/**
 * Creates a named span for an HTTP handler. HTTP instrumentation auto-creates
 * spans for requests, but use this for custom sub-spans inside handlers.
 */
export function traceHttpHandler<T>(
  operationName: string,
  handler: (span: Span) => T,
): T {
  return tracer.startActiveSpan(`http.${operationName}`, (span) => {
    try {
      const result = handler(span);
      span.end();
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error),
      });
      span.end();
      throw error;
    }
  });
}
