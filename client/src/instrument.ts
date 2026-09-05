/**
 * OpenTelemetry Web Instrumentation for Phalanx Duel Client.
 * Routes traces and metrics to the local OTel collector via HTTP/protobuf.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { metrics } from '@opentelemetry/api';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { XMLHttpRequestInstrumentation } from '@opentelemetry/instrumentation-xml-http-request';
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-web';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { MeterProvider, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import { createClientUuid } from './uuid';

const urlParams = new URLSearchParams(window.location.search);
const isLocalHost =
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname === '::1' ||
  window.location.hostname.endsWith('.localhost');
const telemetryDisabled =
  urlParams.get('telemetry') === 'off' ||
  urlParams.get('telemetry') === '0' ||
  localStorage.getItem('phx_telemetry_disabled') === '1' ||
  (window as typeof window & { __PHX_TELEMETRY_DISABLED__?: boolean })
    .__PHX_TELEMETRY_DISABLED__ === true ||
  (!isLocalHost && urlParams.get('telemetry') !== 'on');
// Browser telemetry uses the same-origin proxy on HTTPS local hosts. This
// avoids mixed-content blocking and keeps the collector bound to loopback.
const explicitOtelBaseUrl = urlParams.get('otelBaseUrl')?.trim();
const OTEL_BASE_URL =
  explicitOtelBaseUrl ||
  (window.location.protocol === 'https:' && isLocalHost
    ? `${window.location.origin}/otel`
    : 'http://127.0.0.1:4318');
const deploymentEnvironment = import.meta.env.MODE || 'development';
const serviceInstanceId = `browser:${window.location.host}:${createClientUuid()}`;

const resource = resourceFromAttributes({
  [ATTR_SERVICE_NAME]: 'phx-client',
  'service.namespace': 'phalanxduel',
  'service.version': __APP_VERSION__,
  'deployment.environment': deploymentEnvironment,
  'service.instance.id': serviceInstanceId,
});

if (!telemetryDisabled) {
  // 1. Initialize Tracing
  const tracerProvider = new WebTracerProvider({
    resource,
    spanProcessors: [
      new BatchSpanProcessor(
        new OTLPTraceExporter({
          url: `${OTEL_BASE_URL}/v1/traces`,
        }),
      ),
    ],
  });

  tracerProvider.register({
    contextManager: new ZoneContextManager(),
  });

  // 2. Initialize Metrics
  const metricExporter = new OTLPMetricExporter({
    url: `${OTEL_BASE_URL}/v1/metrics`,
  });

  const meterProvider = new MeterProvider({
    resource,
    readers: [
      new PeriodicExportingMetricReader({
        exporter: metricExporter,
        exportIntervalMillis: 10000,
      }),
    ],
  });

  metrics.setGlobalMeterProvider(meterProvider);
}

// 3. Register automatic instrumentations
registerInstrumentations({
  instrumentations: [
    new (FetchInstrumentation as any)({
      // Propagate trace context to the server
      propagateTraceHeaderCorsUrls: [
        /^https?:\/\/(?:127\.0\.0\.1|localhost)(?::3001)?\/.*/,
        /^https:\/\/(?:play|admin)\.phalanxduel\.localhost\/.*/,
      ],
    }),
    new (XMLHttpRequestInstrumentation as any)({
      propagateTraceHeaderCorsUrls: [
        /^https?:\/\/(?:127\.0\.0\.1|localhost)(?::3001)?\/.*/,
        /^https:\/\/(?:play|admin)\.phalanxduel\.localhost\/.*/,
      ],
    }),
  ],
});

console.log(
  telemetryDisabled
    ? '[phx-client] Telemetry disabled for this browser session'
    : `[phx-client] Telemetry active: phx-client -> ${OTEL_BASE_URL}`,
);
