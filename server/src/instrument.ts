import './loadEnv.js';
import { hostname } from 'node:os';
import { SCHEMA_VERSION } from '@phalanxduel/shared';
import { context } from '@opentelemetry/api';
import { logs, SeverityNumber } from '@opentelemetry/api-logs';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter as HttpTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPTraceExporter as GrpcTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { OTLPLogExporter as HttpLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { OTLPLogExporter as GrpcLogExporter } from '@opentelemetry/exporter-logs-otlp-grpc';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { OTLPMetricExporter as HttpMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPMetricExporter as GrpcMetricExporter } from '@opentelemetry/exporter-metrics-otlp-grpc';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

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

const isProduction = process.env.NODE_ENV === 'production';

// ── Protocol Selection ─────────────────────────────────────────────
const protocol = process.env.OTEL_EXPORTER_OTLP_PROTOCOL ?? 'http/protobuf';
const isHttp = protocol === 'http/protobuf' || protocol === 'http/json';

// OTel collector endpoint
const defaultEndpoint = isHttp ? 'http://127.0.0.1:4318' : 'http://127.0.0.1:4317';
const otlpEndpointRaw = process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? defaultEndpoint;
const otlpEndpoint = normalizeOtlpEndpoint(otlpEndpointRaw);

const otlpConsoleLogsEnabled =
  process.env.OTEL_CONSOLE_LOGS_ENABLED === '1' ||
  process.env.OTEL_CONSOLE_LOGS_ENABLED?.toLowerCase() === 'true' ||
  (!isProduction && process.env.OTEL_CONSOLE_LOGS_ENABLED === undefined);

const serviceName = process.env.OTEL_SERVICE_NAME?.trim() ?? 'phx-server';
process.env.OTEL_SERVICE_NAME ??= serviceName;

const resource = resourceFromAttributes({
  [ATTR_SERVICE_NAME]: serviceName,
  'service.version': SCHEMA_VERSION,
  'host.name': hostname(),
});

originalConsole.log(
  `[instrument] Initializing Pure OTel SDK: ${serviceName} -> ${otlpEndpoint} (${protocol})`,
);

// 1. Configure Exporters
const traceExporter = isHttp
  ? new HttpTraceExporter({ url: `${otlpEndpoint}/v1/traces` })
  : new GrpcTraceExporter({ url: otlpEndpoint });

const metricExporter = isHttp
  ? new HttpMetricExporter({ url: `${otlpEndpoint}/v1/metrics` })
  : new GrpcMetricExporter({ url: otlpEndpoint });

const logExporter = isHttp
  ? new HttpLogExporter({ url: `${otlpEndpoint}/v1/logs` })
  : new GrpcLogExporter({ url: otlpEndpoint });

// 2. Initialize NodeSDK
const sdk = new NodeSDK({
  resource,
  traceExporter,
  metricReader: new PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: isProduction ? 60000 : 5000,
  }),
  logRecordProcessor: new BatchLogRecordProcessor(logExporter),
  instrumentations: [getNodeAutoInstrumentations()],
});

// Start the SDK
sdk.start();

// ── OTLP Console Log Forwarding (Opt-in) ────────────────────────────────────
if (otlpEndpoint && otlpConsoleLogsEnabled) {
  const CONSOLE_PATCH_FLAG = Symbol.for('phalanx.otel.console.patched');
  const globalObj = globalThis as Record<symbol, boolean>;

  if (!globalObj[CONSOLE_PATCH_FLAG]) {
    globalObj[CONSOLE_PATCH_FLAG] = true;

    const logger = logs.getLogger('node.console', '1.0.0');

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

    process.once('beforeExit', () => {
      void sdk.shutdown();
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
  const logger = logs.getLogger('phx-manual-logger');

  logger.emit({
    severityNumber,
    severityText,
    body,
    attributes,
    context: context.active(),
  });
}
