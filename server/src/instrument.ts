import './loadEnv.js';
import * as Sentry from '@sentry/node';
import { hostname } from 'node:os';
import { SCHEMA_VERSION } from '@phalanxduel/shared';
import { metrics, context } from '@opentelemetry/api';
import { logs, SeverityNumber } from '@opentelemetry/api-logs';
import { BatchSpanProcessor, NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { OTLPTraceExporter as HttpTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPTraceExporter as GrpcTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { OTLPLogExporter as HttpLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { OTLPLogExporter as GrpcLogExporter } from '@opentelemetry/exporter-logs-otlp-grpc';
import { MeterProvider, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { BatchLogRecordProcessor, LoggerProvider } from '@opentelemetry/sdk-logs';
import { OTLPMetricExporter as HttpMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPMetricExporter as GrpcMetricExporter } from '@opentelemetry/exporter-metrics-otlp-grpc';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';

// Keep reference to original console for internal debugging
const originalConsole = {
  log: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error,
};

function normalizeOtlpEndpoint(endpoint: string): string {
  return endpoint
    .trim()
    .replace('localhost', '127.0.0.1')
    .replace(/\/+$/u, '')
    .replace(/\/v1\/(traces|metrics|logs)$/u, '');
}

function envFlagEnabled(value: string | undefined): boolean {
  return value === '1' || value?.toLowerCase() === 'true';
}

const isProduction = process.env.NODE_ENV === 'production';
const sentryDsn = process.env.SENTRY_DSN;

// ── Protocol Selection ─────────────────────────────────────────────
// Default to OTLP/HTTP (4318) for better compatibility with proxies/tunnels
// unless gRPC is explicitly requested.
const protocol = process.env.OTEL_EXPORTER_OTLP_PROTOCOL ?? 'http/protobuf';
const isHttp = protocol === 'http/protobuf' || protocol === 'http/json';

// OTel collector endpoint
const defaultEndpoint = isHttp ? 'http://127.0.0.1:4318' : 'http://127.0.0.1:4317';
const otlpEndpointRaw = process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? defaultEndpoint;
const otlpEndpoint = normalizeOtlpEndpoint(otlpEndpointRaw);

const localSentryEnabled = envFlagEnabled(process.env.PHALANX_ENABLE_LOCAL_SENTRY);
const sentryEnabled = !!sentryDsn && (isProduction || localSentryEnabled);
const otlpConsoleLogsEnabled =
  process.env.OTEL_CONSOLE_LOGS_ENABLED === '1' ||
  process.env.OTEL_CONSOLE_LOGS_ENABLED?.toLowerCase() === 'true' ||
  (!isProduction && process.env.OTEL_CONSOLE_LOGS_ENABLED === undefined);

const serviceName = process.env.OTEL_SERVICE_NAME?.trim() ?? 'phx-server';
process.env.OTEL_SERVICE_NAME ??= serviceName;

const resource = resourceFromAttributes({
  [ATTR_SERVICE_NAME]: serviceName,
});

originalConsole.log(
  `[instrument] Initializing OTel: ${serviceName} -> ${otlpEndpoint} (${protocol})`,
);

// 1. Initialize Tracing
const traceExporter = isHttp
  ? new HttpTraceExporter({ url: `${otlpEndpoint}/v1/traces` })
  : new GrpcTraceExporter({ url: otlpEndpoint });

const tracerProvider = new NodeTracerProvider({
  resource,
  spanProcessors: [new BatchSpanProcessor(traceExporter)],
});
tracerProvider.register();

// 2. Initialize Metrics
const metricExporter = isHttp
  ? new HttpMetricExporter({ url: `${otlpEndpoint}/v1/metrics` })
  : new GrpcMetricExporter({ url: otlpEndpoint });

const metricReader = new PeriodicExportingMetricReader({
  exporter: metricExporter,
  exportIntervalMillis: isProduction ? 60000 : 5000,
});

const meterProvider = new MeterProvider({
  resource,
  readers: [metricReader],
});
metrics.setGlobalMeterProvider(meterProvider);

// 3. Initialize Logging
const logExporter = isHttp
  ? new HttpLogExporter({ url: `${otlpEndpoint}/v1/logs` })
  : new GrpcLogExporter({ url: otlpEndpoint });

const loggerProvider = new LoggerProvider({
  resource,
  processors: [new BatchLogRecordProcessor(logExporter)],
});
logs.setGlobalLoggerProvider(loggerProvider);

// ── Sentry Initialization ──────────────────────────────────────────
const integrations = [Sentry.consoleLoggingIntegration({ levels: ['log', 'warn', 'error'] })];

if (sentryEnabled) {
  Sentry.init({
    dsn: sentryDsn,
    environment: process.env.APP_ENV ?? 'development',
    release: `phalanxduel@${SCHEMA_VERSION}`,
    integrations,
    tracesSampleRate: isProduction ? 0.1 : 1.0,
    profilesSampleRate: isProduction ? 0.1 : 1.0,
    serverName: hostname(),
  });
}

// ── OTLP Console Log Forwarding (Opt-in) ────────────────────────────────────
if (otlpEndpoint && otlpConsoleLogsEnabled) {
  const CONSOLE_PATCH_FLAG = Symbol.for('phalanx.otel.console.patched');
  const globalObj = globalThis as Record<symbol, boolean>;

  if (!globalObj[CONSOLE_PATCH_FLAG]) {
    globalObj[CONSOLE_PATCH_FLAG] = true;

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
        const body = toMessage(args);
        // Skip OTel internal logs or recursion
        if (body.includes('[instrument-cli]') || body.includes('[instrument]')) {
          return;
        }

        logger.emit({
          severityNumber,
          severityText,
          body,
          context: context.active(),
        });
      } catch (err) {
        // Fallback to original console for error reporting if OTel fails
        originalConsole.error('[instrument] Failed to emit log to OTel:', err);
      }
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

/**
 * Manually emit a log record to OTel.
 */
export function emitOtlpLog(
  severityNumber: SeverityNumber,
  severityText: string,
  body: string,
  attributes: Record<string, string | number | boolean | undefined> = {},
): void {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!loggerProvider) return;

  const logger = loggerProvider.getLogger('phx-manual-logger');

  logger.emit({
    severityNumber,
    severityText,
    body,
    attributes,
    context: context.active(),
  });
}
