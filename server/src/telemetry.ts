import { NodeSDK } from '@opentelemetry/sdk-node';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-node';
import {
  PeriodicExportingMetricReader,
  ConsoleMetricExporter,
} from '@opentelemetry/sdk-metrics';
import {
  BatchLogRecordProcessor,
  SimpleLogRecordProcessor,
  ConsoleLogRecordExporter,
} from '@opentelemetry/sdk-logs';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { Resource } from '@opentelemetry/resources';
import { logs, SeverityNumber } from '@opentelemetry/api-logs';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';

function parseOtlpHeaders(raw: string | undefined): Record<string, string> {
  if (!raw) return {};

  return raw
    .split(',')
    .map((pair) => pair.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((acc, pair) => {
      const idx = pair.indexOf('=');
      if (idx <= 0) return acc;
      const key = pair.slice(0, idx).trim();
      const value = pair.slice(idx + 1).trim();
      if (!key || !value) return acc;
      acc[key] = value;
      return acc;
    }, {});
}

const otlpEndpoint = process.env['OTEL_EXPORTER_OTLP_ENDPOINT'];
const isOtlpEnabled = !!otlpEndpoint;
const serviceName = process.env['OTEL_SERVICE_NAME'] ?? 'phalanx-server';
const serviceVersion = process.env['OTEL_SERVICE_VERSION'] ?? '0.1.0';
const normalizedOtlpEndpoint = otlpEndpoint?.replace(/\/$/, '');
const commonOtlpHeaders = parseOtlpHeaders(process.env['OTEL_EXPORTER_OTLP_HEADERS']);
const otlpTraceHeaders = {
  ...commonOtlpHeaders,
  ...parseOtlpHeaders(process.env['OTEL_EXPORTER_OTLP_TRACES_HEADERS']),
};
const otlpMetricHeaders = {
  ...commonOtlpHeaders,
  ...parseOtlpHeaders(process.env['OTEL_EXPORTER_OTLP_METRICS_HEADERS']),
};
const otlpLogHeaders = {
  ...commonOtlpHeaders,
  ...parseOtlpHeaders(process.env['OTEL_EXPORTER_OTLP_LOGS_HEADERS']),
};
const otelLogsExporterSetting = process.env['OTEL_LOGS_EXPORTER']?.trim().toLowerCase();
const shouldExportOtelLogs = isOtlpEnabled && otelLogsExporterSetting !== 'none';

const traceExporter = isOtlpEnabled
  ? new OTLPTraceExporter({
      url: `${normalizedOtlpEndpoint}/v1/traces`,
      headers: otlpTraceHeaders,
    })
  : new ConsoleSpanExporter();

const metricReader = new PeriodicExportingMetricReader({
  exporter: isOtlpEnabled
    ? new OTLPMetricExporter({
        url: `${normalizedOtlpEndpoint}/v1/metrics`,
        headers: otlpMetricHeaders,
      })
    : new ConsoleMetricExporter(),
  exportIntervalMillis: isOtlpEnabled ? 10_000 : 60_000,
});

const logRecordProcessors = shouldExportOtelLogs
  ? [
      new BatchLogRecordProcessor(
        new OTLPLogExporter({
          url: `${normalizedOtlpEndpoint}/v1/logs`,
          headers: otlpLogHeaders,
        }),
      ),
    ]
  : [new SimpleLogRecordProcessor(new ConsoleLogRecordExporter())];

const sdk = new NodeSDK({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: serviceName,
    [ATTR_SERVICE_VERSION]: serviceVersion,
  }),
  traceExporter,
  metricReader,
  logRecordProcessors,
  instrumentations: [new HttpInstrumentation()],
});

const otelAppLogger = logs.getLogger('phalanx.pino', serviceVersion);

type PinoLogMethod = (this: unknown, ...args: unknown[]) => unknown;

function levelToSeverityNumber(level: number): SeverityNumber {
  if (level >= 60) return SeverityNumber.FATAL;
  if (level >= 50) return SeverityNumber.ERROR;
  if (level >= 40) return SeverityNumber.WARN;
  if (level >= 30) return SeverityNumber.INFO;
  if (level >= 20) return SeverityNumber.DEBUG;
  return SeverityNumber.TRACE;
}

function levelToSeverityText(level: number): string {
  if (level >= 60) return 'FATAL';
  if (level >= 50) return 'ERROR';
  if (level >= 40) return 'WARN';
  if (level >= 30) return 'INFO';
  if (level >= 20) return 'DEBUG';
  return 'TRACE';
}

function toOtelAttrValue(value: unknown): string | number | boolean {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (value instanceof Error) {
    return value.message;
  }
  if (value === null || value === undefined) {
    return '';
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function parsePinoLog(args: unknown[]): { body: string; attributes: Record<string, string | number | boolean> } {
  if (args.length === 0) {
    return { body: 'log', attributes: {} };
  }

  const first = args[0];
  const second = args[1];
  const attributes: Record<string, string | number | boolean> = {};

  if (first && typeof first === 'object' && !Array.isArray(first) && !(first instanceof Error)) {
    for (const [key, value] of Object.entries(first as Record<string, unknown>)) {
      attributes[key] = toOtelAttrValue(value);
    }
    const msg = typeof second === 'string'
      ? second
      : typeof attributes['msg'] === 'string'
        ? String(attributes['msg'])
        : 'log';
    return { body: msg, attributes };
  }

  if (first instanceof Error) {
    attributes['exception.type'] = first.name;
    attributes['exception.message'] = first.message;
    if (first.stack) attributes['exception.stacktrace'] = first.stack;
    const msg = typeof second === 'string' ? second : first.message || 'error';
    return { body: msg, attributes };
  }

  if (typeof first === 'string') {
    return { body: first, attributes: {} };
  }

  return { body: String(first), attributes: {} };
}

/**
 * Pino hook used by Fastify logger:
 * - keeps normal stdout/stderr logging for Fly logs retention
 * - mirrors entries into OpenTelemetry Logs for OTLP export
 */
export function otelPinoLogMethodHook(this: unknown, args: unknown[], method: PinoLogMethod, level: number): void {
  if (shouldExportOtelLogs) {
    try {
      const parsed = parsePinoLog(args);
      otelAppLogger.emit({
        severityNumber: levelToSeverityNumber(level),
        severityText: levelToSeverityText(level),
        body: parsed.body,
        attributes: parsed.attributes,
      });
    } catch {
      // Never let telemetry interfere with app logging.
    }
  }

  void method.apply(this, args);
}

/**
 * Initializes OpenTelemetry SDK. Call this before importing any HTTP/WS modules
 * to ensure automatic instrumentation patches are applied.
 *
 * For full ESM instrumentation in production, start the server with:
 *   node --import ./dist/telemetry.js ./dist/index.js
 */
export function initTelemetry(): void {
  sdk.start();

  const shutdown = () => {
    sdk
      .shutdown()
      .then(() => console.log('OpenTelemetry shut down'))
      .catch((err) => console.error('OpenTelemetry shutdown error', err))
      .finally(() => process.exit(0));
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

export { sdk };
