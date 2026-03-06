import './loadEnv.js';
import * as Sentry from '@sentry/node';
import { hostname } from 'node:os';
import { SCHEMA_VERSION } from '@phalanxduel/shared';
import { trace, metrics } from '@opentelemetry/api';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';

const isProduction = process.env.NODE_ENV === 'production';

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

if (process.env['SENTRY__SERVER__SENTRY_DSN']) {
  Sentry.init({
    dsn: process.env['SENTRY__SERVER__SENTRY_DSN'],
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

  // ── Local OTel Collector Integration ──────────────────────────────────────
  // If an OTLP endpoint is provided, also export traces/metrics there.
  const otlpEndpoint = process.env['OTEL_EXPORTER_OTLP_ENDPOINT'];
  if (otlpEndpoint) {
    // Add OTLP Trace Exporter
    const traceExporter = new OTLPTraceExporter({
      url: `${otlpEndpoint}/v1/traces`,
    });
    const spanProcessor = new BatchSpanProcessor(traceExporter);

    // Sentry 8.x registers the global TracerProvider.
    // We add our processor to the existing provider.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const provider = trace.getTracerProvider() as any;
    if (provider && typeof provider.addSpanProcessor === 'function') {
      provider.addSpanProcessor(spanProcessor);
    }

    // Add OTLP Metric Exporter
    const metricExporter = new OTLPMetricExporter({
      url: `${otlpEndpoint}/v1/metrics`,
    });
    const metricReader = new PeriodicExportingMetricReader({
      exporter: metricExporter,
      exportIntervalMillis: 5000,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const meterProvider = metrics.getMeterProvider() as any;
    if (meterProvider && typeof meterProvider.addMetricReader === 'function') {
      meterProvider.addMetricReader(metricReader);
    }
  }
}
