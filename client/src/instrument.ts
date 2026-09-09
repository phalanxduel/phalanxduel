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
import { openobserveLogs } from '@openobserve/browser-logs';
import { openobserveRum } from '@openobserve/browser-rum';
import { createClientUuid } from './uuid';
import { recordWebVital } from './analytics';
import { isLocalTelemetryHost } from './telemetry-config';

const urlParams = new URLSearchParams(window.location.search);
const isLocalHost = isLocalTelemetryHost(window.location.hostname);
const telemetryDisabled =
  urlParams.get('telemetry') === 'off' ||
  urlParams.get('telemetry') === '0' ||
  localStorage.getItem('phx_telemetry_disabled') === '1' ||
  (window as typeof window & { __PHX_TELEMETRY_DISABLED__?: boolean })
    .__PHX_TELEMETRY_DISABLED__ === true ||
  !isLocalHost;
// Same-origin intake also works from LAN devices, where loopback is not the server.
const explicitOtelBaseUrl = urlParams.get('otelBaseUrl')?.trim();
const OTEL_BASE_URL = explicitOtelBaseUrl || `${window.location.origin}/otel`;
const deploymentEnvironment = isLocalHost ? 'development' : import.meta.env.MODE;
const serviceInstanceId = `browser:${window.location.host}:${createClientUuid()}`;
const openObserveRumToken = import.meta.env.VITE_PHX_RUM_TOKEN?.trim();

const resource = resourceFromAttributes({
  [ATTR_SERVICE_NAME]: 'phx-client',
  'service.namespace': 'phalanxduel',
  'service.version': __APP_VERSION__,
  'deployment.environment': deploymentEnvironment,
  'service.instance.id': serviceInstanceId,
});

if (!telemetryDisabled) {
  if (openObserveRumToken) {
    const openObserveOptions = {
      clientToken: openObserveRumToken,
      applicationId: 'phx-client',
      site: window.location.host,
      service: 'phx-client',
      env: 'development',
      version: __APP_VERSION__,
      organizationIdentifier: 'default',
      insecureHTTP: window.location.protocol === 'http:',
      apiVersion: 'v1',
    } as const;

    openobserveRum.init({
      ...openObserveOptions,
      trackResources: true,
      trackLongTasks: true,
      trackUserInteractions: true,
      defaultPrivacyLevel: 'mask-user-input',
      sessionSampleRate: 100,
      sessionReplaySampleRate: 50,
    });

    openobserveLogs.init({
      ...openObserveOptions,
      forwardErrorsToLogs: true,
    });

    // This is a stable local-only operator identity for devtestenv. Do not
    // attach player, match, email, or token identity to browser telemetry.
    openobserveRum.setUser({
      id: 'root@zdots.local',
      name: 'Phalanx Duel local operator',
    });
    openobserveRum.startSessionReplayRecording();
  }

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

if (!telemetryDisabled) {
  // Local demo hosts report telemetry regardless of build mode. Public hosts
  // remain disabled even when a query string tries to opt in.
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

  // Keep the browser experience signal local and lightweight. These observers
  // are intentionally development-only and emit no player or page contents.
  if (typeof PerformanceObserver !== 'undefined') {
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'largest-contentful-paint') {
            recordWebVital('LCP', entry.startTime);
          } else if (entry.entryType === 'first-input') {
            const firstInput = entry as PerformanceEventTiming;
            recordWebVital('FID', firstInput.processingStart - firstInput.startTime);
          } else if (entry.entryType === 'event') {
            const eventTiming = entry as PerformanceEventTiming;
            recordWebVital('INP', eventTiming.duration);
          }
        }
      }).observe({
        type: 'largest-contentful-paint',
        buffered: true,
      });
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const timing = entry as PerformanceEventTiming;
          recordWebVital('FID', timing.processingStart - timing.startTime);
        }
      }).observe({ type: 'first-input', buffered: true });
    } catch {
      // Older browsers may reject one or more entry types.
    }
  }
}

console.log(
  telemetryDisabled
    ? '[phx-client] Telemetry disabled for this browser session'
    : `[phx-client] Telemetry active: phx-client -> ${OTEL_BASE_URL}`,
);
