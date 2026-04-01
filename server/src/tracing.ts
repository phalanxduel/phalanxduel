import {
  context,
  propagation,
  SpanKind,
  type Attributes,
  type Span,
  type TextMapGetter,
} from '@opentelemetry/api';
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

export interface WsTelemetryCarrier {
  traceparent?: string;
  tracestate?: string;
  baggage?: string;
  qaRunId?: string;
  sessionId?: string;
  reconnectAttempt?: number;
  originService?: string;
}

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
    ? // eslint-disable-next-line security/detect-unsafe-regex
      /^(\[[^\]]+\])(?::(\d+))?$/u.exec(host)
    : // eslint-disable-next-line security/detect-unsafe-regex
      /^([^:]+)(?::(\d+))?$/u.exec(host);

  if (!parsed) {
    return { address: host };
  }

  return {
    address: parsed[1] ?? host,
    port: parsed[2] ? Number(parsed[2]) : undefined,
  };
}

export function httpRequestAttributes(
  request: Pick<FastifyRequest, 'headers' | 'hostname' | 'method' | 'routeOptions' | 'url'>,
  extraAttributes: Attributes = {},
): Attributes {
  const route = request.routeOptions.url;
  const path = route ?? request.url.split('?')[0] ?? request.url;
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

const wsTelemetryGetter: TextMapGetter<WsTelemetryCarrier> = {
  keys(carrier) {
    return ['traceparent', 'tracestate', 'baggage'].filter((key) =>
      Boolean(carrier[key as keyof WsTelemetryCarrier]),
    );
  },
  get(carrier, key) {
    const value = carrier[key as keyof WsTelemetryCarrier];
    return typeof value === 'string' ? value : undefined;
  },
};

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
  telemetry: WsTelemetryCarrier | undefined,
  handler: (span: Span) => Promise<T> | T,
): Promise<T> {
  const baseAttributes: Attributes = {
    [ATTR_HTTP_ROUTE]: '/ws',
    [ATTR_NETWORK_PROTOCOL_NAME]: 'websocket',
    ...attributes,
    ...(telemetry?.qaRunId ? { 'qa.run_id': telemetry.qaRunId } : {}),
    ...(telemetry?.sessionId ? { 'ws.session_id': telemetry.sessionId } : {}),
    ...(telemetry?.sessionId ? { 'game.session_id': telemetry.sessionId } : {}),
    ...(telemetry?.reconnectAttempt !== undefined
      ? { 'ws.reconnect_attempt': telemetry.reconnectAttempt }
      : {}),
    ...(telemetry?.originService ? { 'ws.origin_service': telemetry.originService } : {}),
    ...(telemetry?.originService ? { 'peer.service': telemetry.originService } : {}),
  };

  const parentContext = telemetry
    ? propagation.extract(context.active(), telemetry, wsTelemetryGetter)
    : context.active();

  return context.with(parentContext, () =>
    withActiveSpan(
      `ws.${messageType}`,
      {
        attributes: baseAttributes,
        kind: SpanKind.SERVER,
      },
      handler,
    ),
  );
}

/**
 * Creates a named span for an HTTP handler. HTTP instrumentation auto-creates
 * spans for requests, but use this for custom sub-spans inside handlers.
 */
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
