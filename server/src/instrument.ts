import './loadEnv.js';
import * as Sentry from '@sentry/node';
import { hostname } from 'node:os';
import { SCHEMA_VERSION } from '@phalanxduel/shared';
import { trace, metrics } from '@opentelemetry/api';
import { logs, SeverityNumber } from '@opentelemetry/api-logs';
import { BatchSpanProcessor, NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { MeterProvider, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { BatchLogRecordProcessor, LoggerProvider } from '@opentelemetry/sdk-logs';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';

const isProduction = process.env.NODE_ENV === 'production';
const sentryDsn = process.env['SENTRY__SERVER__SENTRY_DSN'];
const otlpEndpoint = process.env['OTEL_EXPORTER_OTLP_ENDPOINT'];
const sentryEnabled = !!sentryDsn;
const otlpConsoleLogsEnabled =
  process.env['OTEL_CONSOLE_LOGS_ENABLED'] === '1' ||
  process.env['OTEL_CONSOLE_LOGS_ENABLED']?.toLowerCase() === 'true';

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

// ── OTLP Console Log Forwarding (Opt-in) ────────────────────────────────────
// Disabled by default to avoid behavior changes. Enable with:
//   OTEL_CONSOLE_LOGS_ENABLED=1
if (otlpEndpoint && otlpConsoleLogsEnabled) {
  const CONSOLE_PATCH_FLAG = Symbol.for('phalanx.otel.console.patched');
  const globalObj = globalThis as Record<symbol, boolean>;

  if (!globalObj[CONSOLE_PATCH_FLAG]) {
    globalObj[CONSOLE_PATCH_FLAG] = true;

    const serviceName = process.env['OTEL_SERVICE_NAME'] || 'phalanxduel-server';
    const resource = resourceFromAttributes({
      [ATTR_SERVICE_NAME]: serviceName,
    });

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
