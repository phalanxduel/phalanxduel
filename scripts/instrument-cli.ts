/**
 * Lightweight OpenTelemetry instrumentation for Phalanx CLI tools.
 * Routes traces, metrics, and logs to the local OTel collector.
 */

import { metrics, trace, SpanStatusCode, context } from '@opentelemetry/api';
import { logs, SeverityNumber } from '@opentelemetry/api-logs';
import { BatchSpanProcessor, NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { MeterProvider, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { LoggerProvider, BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { basename } from 'node:path';

const otlpEndpointRaw = process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://127.0.0.1:4318';
const otlpEndpoint = otlpEndpointRaw.replace(/\/+$/, '').replace(/\/v1\/(traces|metrics|logs)$/, '');
const scriptName = basename(process.argv[1] ?? 'unknown').replace(/\.(ts|js)$/, '');

// Ensure service name starts with 'phx-' and indicates the process
let serviceName = process.env.OTEL_SERVICE_NAME ?? `phx-cli-${scriptName}`;
if (!serviceName.startsWith('phx-')) {
  serviceName = `phx-${serviceName}`;
}
// If it's a generic name, add the script indicator
if (serviceName === 'phx-cli' || serviceName === 'phx-shell' || serviceName.includes('zdots')) {
  serviceName = `${serviceName}-${scriptName}`;
}

const resource = resourceFromAttributes({
  [ATTR_SERVICE_NAME]: serviceName,
});

// 1. Initialize Tracing
const traceExporter = new OTLPTraceExporter({
  url: `${otlpEndpoint}/v1/traces`,
});

const tracerProvider = new NodeTracerProvider({
  resource,
  spanProcessors: [new BatchSpanProcessor(traceExporter)],
});
tracerProvider.register();

// 2. Initialize Metrics
const metricExporter = new OTLPMetricExporter({
  url: `${otlpEndpoint}/v1/metrics`,
});

const metricReader = new PeriodicExportingMetricReader({
  exporter: metricExporter,
  exportIntervalMillis: 5000,
});

const meterProvider = new MeterProvider({
  resource,
  readers: [metricReader],
});
metrics.setGlobalMeterProvider(meterProvider);

// 3. Initialize Logs
const logExporter = new OTLPLogExporter({
  url: `${otlpEndpoint}/v1/logs`,
});

const loggerProvider = new LoggerProvider({
  resource,
  processors: [new BatchLogRecordProcessor(logExporter)],
});
logs.setGlobalLoggerProvider(loggerProvider);

const logger = loggerProvider.getLogger('phx-cli-logger', '1.0.0');

// ── Root Span for Command Execution ──────────────────────────────────
const tracer = trace.getTracer('phx-cli');
const rootSpan = tracer.startSpan(`phx.cli.${scriptName}`, {
  attributes: {
    'cli.command': process.argv.join(' '),
    'cli.script': scriptName,
  },
});

// Patch console to capture logs
const originalConsole = {
  log: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error,
};

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
      context: context.active(),
    });
  } catch {
    // Fail silently
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

// Flush and end span on exit
const shutdown = async () => {
  rootSpan.end();
  await Promise.all([
    tracerProvider.forceFlush(),
    meterProvider.forceFlush(),
    loggerProvider.forceFlush(),
  ]);
};

process.on('SIGINT', async () => {
  rootSpan.setStatus({ code: SpanStatusCode.ERROR, message: 'SIGINT' });
  await shutdown();
  process.exit(0);
});

process.on('uncaughtException', async (err) => {
  rootSpan.recordException(err);
  rootSpan.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
  await shutdown();
  process.exit(1);
});

process.on('beforeExit', shutdown);

console.log(`[instrument-cli] Telemetry active: ${serviceName} -> ${otlpEndpoint}`);
