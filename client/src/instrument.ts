/**
 * OpenTelemetry Web Instrumentation for Phalanx Duel Client.
 * Routes traces and metrics to the local OTel collector via HTTP/protobuf.
 */

/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any */

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

// In development, we point to the host-based collector.
const OTEL_BASE_URL = 'http://127.0.0.1:4318';

const resource = resourceFromAttributes({
  [ATTR_SERVICE_NAME]: 'phx-client',
});

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

// 3. Register automatic instrumentations
registerInstrumentations({
  instrumentations: [
    new (FetchInstrumentation as any)({
      // Propagate trace context to the server
      propagateTraceHeaderCorsUrls: [/http:\/\/127.0.0.1:3001\/.*/, /http:\/\/127.0.0.1:3001\/.*/],
    }),
    new (XMLHttpRequestInstrumentation as any)({
      propagateTraceHeaderCorsUrls: [/http:\/\/127.0.0.1:3001\/.*/, /http:\/\/127.0.0.1:3001\/.*/],
    }),
  ],
});

console.log(`[phx-client] Telemetry active: phx-client -> ${OTEL_BASE_URL}`);
