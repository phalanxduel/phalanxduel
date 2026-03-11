import './loadEnv.js';
import * as Sentry from '@sentry/node';
import { hostname } from 'node:os';
import { SCHEMA_VERSION } from '@phalanxduel/shared';
import { metrics } from '@opentelemetry/api';
import { logs, SeverityNumber } from '@opentelemetry/api-logs';
import { BatchSpanProcessor, NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { MeterProvider, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { BatchLogRecordProcessor, LoggerProvider } from '@opentelemetry/sdk-logs';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';

type MeterProviderWithAddMetricReader = {
  addMetricReader(reader: PeriodicExportingMetricReader): void;
};

function hasAddMetricReader(value: unknown): value is MeterProviderWithAddMetricReader {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof Reflect.get(value, 'addMetricReader') === 'function'
  );
}

function normalizeOtlpEndpoint(endpoint: string): string {
  return endpoint
    .trim()
    .replace(/\/+$/u, '')
    .replace(/\/v1\/(traces|metrics|logs)$/u, '');
}

function envFlagEnabled(value: string | undefined): boolean {
  return value === '1' || value?.toLowerCase() === 'true';
}

const isProduction = process.env.NODE_ENV === 'production';
const sentryDsn = process.env['SENTRY__SERVER__SENTRY_DSN'];
const otlpEndpointRaw = process.env['OTEL_EXPORTER_OTLP_ENDPOINT'];
const otlpEndpoint = otlpEndpointRaw ? normalizeOtlpEndpoint(otlpEndpointRaw) : undefined;
const localSentryEnabled = envFlagEnabled(process.env['PHALANX_ENABLE_LOCAL_SENTRY']);
const sentryEnabled = !!sentryDsn && (isProduction || localSentryEnabled);
const otlpConsoleLogsEnabled =
  process.env['OTEL_CONSOLE_LOGS_ENABLED'] === '1' ||
  process.env['OTEL_CONSOLE_LOGS_ENABLED']?.toLowerCase() === 'true';
const serviceName = process.env['OTEL_SERVICE_NAME']?.trim() || 'phalanxduel-server';
process.env['OTEL_SERVICE_NAME'] ??= serviceName;
const resource = resourceFromAttributes({
  [ATTR_SERVICE_NAME]: serviceName,
});

const integrations = [Sentry.consoleLoggingIntegration({ levels: ['log', 'warn', 'error'] })];
const traceExporter = otlpEndpoint
  ? new OTLPTraceExporter({
      url: `${otlpEndpoint}/v1/traces`,
    })
  : undefined;

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
    // Dual-export Sentry-managed spans to OTLP when configured.
    ...(traceExporter
      ? {
          openTelemetrySpanProcessors: [new BatchSpanProcessor(traceExporter)],
        }
      : {}),
  });
}

// ── OTLP Export Integration ─────────────────────────────────────────────────
// Supports both:
// 1) Sentry + OTLP dual-export mode
// 2) OTLP-only mode (no Sentry DSN set), useful for local SigNoz dev/test
if (otlpEndpoint) {
  const metricExporter = new OTLPMetricExporter({
    url: `${otlpEndpoint}/v1/metrics`,
  });
  const metricReader = new PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: 5000,
  });

  if (sentryEnabled) {
    // Sentry exposes a meter provider through the OTel API surface, but the
    // runtime may also support attaching readers directly.
    const meterProvider = metrics.getMeterProvider() as unknown;
    if (hasAddMetricReader(meterProvider)) {
      meterProvider.addMetricReader(metricReader);
    } else {
      const fallbackMeterProvider = new MeterProvider({
        resource,
        readers: [metricReader],
      });
      metrics.setGlobalMeterProvider(fallbackMeterProvider);
    }
  } else {
    // OTLP-only mode: register standalone OpenTelemetry SDK providers.
    if (!traceExporter) {
      throw new Error('OTLP trace exporter must be configured when OTLP endpoint is set');
    }
    const tracerProvider = new NodeTracerProvider({
      resource,
      spanProcessors: [new BatchSpanProcessor(traceExporter)],
    });
    tracerProvider.register();

    const meterProvider = new MeterProvider({
      resource,
      readers: [metricReader],
    });
    metrics.setGlobalMeterProvider(meterProvider);
  }
}

// ── OTLP Console Log Forwarding (Opt-in) ────────────────────────────────────
// Disabled by default to avoid behavior changes. Enable with:
//   OTEL_CONSOLE_LOGS_ENABLED=1
if (otlpEndpoint && otlpConsoleLogsEnabled) {
  const CONSOLE_PATCH_FLAG = Symbol.for('phalanx.otel.console.patched');
  const globalObj = globalThis as Record<symbol, boolean>;

  if (!globalObj[CONSOLE_PATCH_FLAG]) {
    globalObj[CONSOLE_PATCH_FLAG] = true;

    const logExporter = new OTLPLogExporter({
      url: `${otlpEndpoint}/v1/logs`,
    });

    const loggerProvider = new LoggerProvider({
      resource,
      processors: [new BatchLogRecordProcessor(logExporter)],
    });
    logs.setGlobalLoggerProvider(loggerProvider);

    const logger = loggerProvider.getLogger('node.console', '1.0.0');

    const toMessage = (args: unknown[]): string =>
      args
        .map((arg) => {
          if (typeof arg === 'string') return arg;
          if (arg instanceof Error) return arg.stack ?? arg.message;
          try {
            return JSON.stringify(arg);
          } catch {
            return String(arg);
          }
        })
        .join(' ');

    const emit = (severityNumber: SeverityNumber, severityText: string, args: unknown[]) => {
      try {
        logger.emit({
          severityNumber,
          severityText,
          body: toMessage(args),
          attributes: {},
        });
      } catch {
        // Never break runtime behavior if log export fails.
      }
    };

    const originalConsole = {
      log: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error,
    };

    console.log = (...args: unknown[]) => {
      emit(SeverityNumber.INFO, 'INFO', args);
      originalConsole.log.apply(console, args);
    };

    console.info = (...args: unknown[]) => {
      emit(SeverityNumber.INFO, 'INFO', args);
      originalConsole.info.apply(console, args);
    };

    console.warn = (...args: unknown[]) => {
      emit(SeverityNumber.WARN, 'WARN', args);
      originalConsole.warn.apply(console, args);
    };

    console.error = (...args: unknown[]) => {
      emit(SeverityNumber.ERROR, 'ERROR', args);
      originalConsole.error.apply(console, args);
    };

    const flushLogs = async () => {
      try {
        await loggerProvider.forceFlush();
      } catch {
        // Ignore flush errors on shutdown.
      }
    };
    process.once('beforeExit', () => {
      void flushLogs();
    });
  }
}
