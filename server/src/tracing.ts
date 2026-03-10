import { SpanKind, type Attributes, type Span } from '@opentelemetry/api';
import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  ATTR_HTTP_REQUEST_METHOD,
  ATTR_HTTP_RESPONSE_STATUS_CODE,
  ATTR_HTTP_ROUTE,
  ATTR_NETWORK_PROTOCOL_NAME,
  ATTR_SERVER_ADDRESS,
  ATTR_SERVER_PORT,
  ATTR_URL_PATH,
} from '@opentelemetry/semantic-conventions';
import { withActiveSpan } from './observability.js';

interface HttpTraceOptions {
  attributes?: Attributes;
  getStatusCode?: () => number | undefined;
}

function parseHostHeader(hostHeader: string | undefined): {
  address?: string;
  port?: number;
} {
  if (!hostHeader) return {};

  const host = hostHeader.trim();
  if (!host) return {};

  const parsed = host.startsWith('[')
    ? /^(\[[^\]]+\])(?::(\d+))?$/u.exec(host)
    : /^([^:]+)(?::(\d+))?$/u.exec(host);

  if (!parsed) {
    return { address: host };
  }

  return {
    address: parsed[1]!,
    port: parsed[2] ? Number(parsed[2]) : undefined,
  };
}

export function httpRequestAttributes(
  request: Pick<FastifyRequest, 'headers' | 'hostname' | 'method' | 'routeOptions' | 'url'>,
  extraAttributes: Attributes = {},
): Attributes {
  const route = request.routeOptions.url;
  const path = route || request.url.split('?')[0] || request.url;
  const host = parseHostHeader(request.headers.host);

  return {
    [ATTR_HTTP_REQUEST_METHOD]: request.method,
    [ATTR_HTTP_ROUTE]: route,
    [ATTR_NETWORK_PROTOCOL_NAME]: 'http',
    [ATTR_SERVER_ADDRESS]: host.address ?? request.hostname,
    ...(host.port !== undefined ? { [ATTR_SERVER_PORT]: host.port } : {}),
    [ATTR_URL_PATH]: path,
    ...extraAttributes,
  };
}

export function httpTraceContext(
  request: Pick<FastifyRequest, 'headers' | 'hostname' | 'method' | 'routeOptions' | 'url'>,
  reply: Pick<FastifyReply, 'statusCode'>,
  extraAttributes: Attributes = {},
): HttpTraceOptions {
  return {
    attributes: httpRequestAttributes(request, extraAttributes),
    getStatusCode: () => reply.statusCode,
  };
}

function isHttpTraceOptions(value: Attributes | HttpTraceOptions): value is HttpTraceOptions {
  return 'attributes' in value || 'getStatusCode' in value;
}

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
  return withActiveSpan(
    `ws.${messageType}`,
    {
      attributes: {
        [ATTR_HTTP_ROUTE]: '/ws',
        [ATTR_NETWORK_PROTOCOL_NAME]: 'websocket',
        ...attributes,
      },
      kind: SpanKind.SERVER,
    },
    handler,
  );
}

/**
 * Creates a named span for an HTTP handler. HTTP instrumentation auto-creates
 * spans for requests, but use this for custom sub-spans inside handlers.
 */
export function traceHttpHandler<T>(
  operationName: string,
  options: HttpTraceOptions,
  handler: (span: Span) => Promise<T> | T,
): Promise<T>;
export function traceHttpHandler<T>(
  operationName: string,
  attributes: Attributes,
  handler: (span: Span) => Promise<T> | T,
): Promise<T>;
export function traceHttpHandler<T>(
  operationName: string,
  handler: (span: Span) => Promise<T> | T,
): Promise<T>;
export function traceHttpHandler<T>(
  operationName: string,
  attributesOrHandler: Attributes | HttpTraceOptions | ((span: Span) => Promise<T> | T),
  maybeHandler?: (span: Span) => Promise<T> | T,
): Promise<T> {
  const options =
    typeof attributesOrHandler === 'function'
      ? {}
      : isHttpTraceOptions(attributesOrHandler)
        ? attributesOrHandler
        : { attributes: attributesOrHandler };
  const handler =
    typeof attributesOrHandler === 'function'
      ? attributesOrHandler
      : (maybeHandler as (span: Span) => Promise<T> | T);

  return withActiveSpan(
    `http.${operationName}`,
    { attributes: options.attributes ?? {}, kind: SpanKind.SERVER },
    async (span) => {
      try {
        return await handler(span);
      } finally {
        const statusCode = options.getStatusCode?.();
        if (statusCode !== undefined) {
          span.setAttribute(ATTR_HTTP_RESPONSE_STATUS_CODE, statusCode);
        }
      }
    },
  );
}
