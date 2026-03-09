import './loadEnv.js';
import * as Sentry from '@sentry/node';
import { hostname } from 'node:os';
import { SCHEMA_VERSION } from '@phalanxduel/shared';
import { trace, metrics } from '@opentelemetry/api';
import { BatchSpanProcessor, NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { MeterProvider, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';

const isProduction = process.env.NODE_ENV === 'production';
const sentryDsn = process.env['SENTRY__SERVER__SENTRY_DSN'];
const otlpEndpoint = process.env['OTEL_EXPORTER_OTLP_ENDPOINT'];
const sentryEnabled = !!sentryDsn;

const integrations = [Sentry.consoleLoggingIntegration({ levels: ['log', 'warn', 'error'] })];

if (!isProduction) {
  integrations.push(Sentry.spotlightIntegration());
}

// Try to load profiling integration if available
try {
  const { nodeProfilingIntegration } = await import('@sentry/profiling-node');
  if (nodeProfilingIntegration) {
    integrations.push(nodeProfilingIntegration());
  }
} catch {
  // Silently fail profiling if binary is missing or incompatible
}

if (sentryEnabled) {
  Sentry.init({
    dsn: sentryDsn,
    release: process.env.SENTRY_RELEASE || `phalanxduel-server@${SCHEMA_VERSION}`,
    integrations,
    // Structured log ingestion via Sentry.logger.*
    enableLogs: true,
    // Performance Monitoring
    tracesSampleRate: process.env.SENTRY_TRACES_SAMPLE_RATE
      ? parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE)
      : 1.0,
    // Continuous profiling (SDK v8+ API)
    profileSessionSampleRate: process.env.SENTRY_PROFILES_SAMPLE_RATE
      ? parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE)
      : 1.0,
    profileLifecycle: 'trace',
    environment: process.env.NODE_ENV || 'development',
    debug: !isProduction && !!process.env.SENTRY_DEBUG,
    sendDefaultPii: true,

    initialScope: {
      tags: {
        'host.name': process.env['FLY_MACHINE_ID'] || hostname(),
        'cloud.provider': process.env['FLY_APP_NAME'] ? 'fly_io' : 'local',
        'cloud.region': process.env['FLY_REGION'] || 'unknown',
      },
    },
  });
}

// ── OTLP Export Integration ─────────────────────────────────────────────────
// Supports both:
// 1) Sentry + OTLP dual-export mode
// 2) OTLP-only mode (no Sentry DSN set), useful for local SigNoz dev/test
if (otlpEndpoint) {
  const traceExporter = new OTLPTraceExporter({
    url: `${otlpEndpoint}/v1/traces`,
  });
  const metricExporter = new OTLPMetricExporter({
    url: `${otlpEndpoint}/v1/metrics`,
  });
  const metricReader = new PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: 5000,
  });

  if (sentryEnabled) {
    // Sentry 8.x may register global providers. If they expose extension methods,
    // attach OTLP exporters for dual-export behavior.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tracerProvider = trace.getTracerProvider() as any;
    if (tracerProvider && typeof tracerProvider.addSpanProcessor === 'function') {
      tracerProvider.addSpanProcessor(new BatchSpanProcessor(traceExporter));
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const meterProvider = metrics.getMeterProvider() as any;
    if (meterProvider && typeof meterProvider.addMetricReader === 'function') {
      meterProvider.addMetricReader(metricReader);
    }
  } else {
    // OTLP-only mode: register standalone OpenTelemetry SDK providers.
    const tracerProvider = new NodeTracerProvider({
      spanProcessors: [new BatchSpanProcessor(traceExporter)],
    });
    tracerProvider.register();

    const meterProvider = new MeterProvider({
      readers: [metricReader],
    });
    metrics.setGlobalMeterProvider(meterProvider);
  }
}
