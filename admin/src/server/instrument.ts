import * as Sentry from '@sentry/node';
import { hostname } from 'node:os';
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

interface MeterProviderWithAddMetricReader {
  addMetricReader(reader: PeriodicExportingMetricReader): void;
}

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
const sentryDsn = process.env.SENTRY_DSN; // Using the primary DSN for admin project
// OTel collector endpoint with default to 127.0.0.1:4318 (local development)
const otlpEndpointRaw = process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://127.0.0.1:4318';
const otlpEndpoint = normalizeOtlpEndpoint(otlpEndpointRaw);
const localSentryEnabled = envFlagEnabled(process.env.PHALANX_ENABLE_LOCAL_SENTRY);
const sentryEnabled = !!sentryDsn && (isProduction || localSentryEnabled);
const otlpConsoleLogsEnabled =
  process.env.OTEL_CONSOLE_LOGS_ENABLED === '1' ||
  process.env.OTEL_CONSOLE_LOGS_ENABLED?.toLowerCase() === 'true';
const serviceName = process.env.OTEL_SERVICE_NAME?.trim() ?? 'phalanxduel';
process.env.OTEL_SERVICE_NAME ??= serviceName;
const resource = resourceFromAttributes({
  [ATTR_SERVICE_NAME]: serviceName,
});

const integrations = [Sentry.consoleLoggingIntegration({ levels: ['log', 'warn', 'error'] })];

// Create OTLP trace exporter (primary telemetry path)
let traceExporter: OTLPTraceExporter | undefined;
try {
  traceExporter = new OTLPTraceExporter({
    url: `${otlpEndpoint}/v1/traces`,
  });
} catch (error) {
  console.warn(
    `[instrument.ts] Failed to initialize OTLP trace exporter at ${otlpEndpoint}:`,
    error instanceof Error ? error.message : error,
  );
}

if (!isProduction) {
  integrations.push(Sentry.spotlightIntegration());
}

// Try to load profiling integration if available
try {
  const { nodeProfilingIntegration } = await import('@sentry/profiling-node');
  integrations.push(nodeProfilingIntegration());
} catch {
  // Silently fail profiling if binary is missing or incompatible
}

// Initialize Sentry for error/exception capturing only (not span export).
// Spans are exported via OTLP to the local collector instead.
if (sentryEnabled) {
  Sentry.init({
    dsn: sentryDsn,
    release: process.env.SENTRY_RELEASE ?? `phalanxduel@0.1.0`,
    integrations: (defaults) => [...defaults.filter((i) => i.name !== 'Fastify'), ...integrations],
    enableLogs: true,
    tracesSampleRate: 0,
    profileSessionSampleRate: process.env.SENTRY_PROFILES_SAMPLE_RATE
      ? parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE)
      : 1.0,
    profileLifecycle: 'trace',
    environment: process.env.APP_ENV ?? process.env.NODE_ENV ?? 'development',
    debug: !isProduction && !!process.env.SENTRY_DEBUG,
    sendDefaultPii: true,

    initialScope: {
      tags: {
        'host.name': process.env.FLY_MACHINE_ID ?? hostname(),
        'cloud.provider': process.env.FLY_APP_NAME ? 'fly_io' : 'local',
        'cloud.region': process.env.FLY_REGION ?? 'unknown',
      },
    },
  });
} else {
  console.log('[instrument.ts] Sentry not enabled for Admin. Using OTLP for all telemetry.');
}

// ── OTLP Export Integration ─────────────────────────────────────────────────
try {
  const metricExporter = new OTLPMetricExporter({
    url: `${otlpEndpoint}/v1/metrics`,
  });
  const metricReader = new PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: 5000,
  });

  if (sentryEnabled && traceExporter) {
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
  } else if (traceExporter) {
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
} catch (error) {
  console.error(
    '[instrument.ts] Failed to initialize OTLP metric exporter:',
    error instanceof Error ? error.message : error,
  );
}

// ── OTLP Console Log Forwarding (Opt-in) ────────────────────────────────────
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

    const logger = loggerProvider.getLogger('admin.console', '1.0.0');

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
