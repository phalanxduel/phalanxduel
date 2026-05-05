/**
 * Lightweight OpenTelemetry instrumentation for Phalanx CLI tools.
 * Routes traces, metrics, and logs to the local OTel collector.
 * Supports both gRPC (4317) and OTLP/HTTP (4318).
 * Uses NodeSDK for integrated auto-instrumentation.
 */

import { trace, SpanStatusCode, context } from '@opentelemetry/api';
import { logs, SeverityNumber } from '@opentelemetry/api-logs';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter as HttpTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPTraceExporter as GrpcTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { OTLPMetricExporter as HttpMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPMetricExporter as GrpcMetricExporter } from '@opentelemetry/exporter-metrics-otlp-grpc';
import { OTLPLogExporter as HttpLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { OTLPLogExporter as GrpcLogExporter } from '@opentelemetry/exporter-logs-otlp-grpc';
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { basename } from 'node:path';
import { hostname } from 'node:os';

// Keep reference to original console
const originalConsole = {
  log: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error,
};

const protocol = process.env.OTEL_EXPORTER_OTLP_PROTOCOL ?? 'http/protobuf';
const isHttp = protocol === 'http/protobuf' || protocol === 'http/json';

// Default endpoints based on protocol
const defaultEndpoint = isHttp ? 'http://127.0.0.1:4318' : 'http://127.0.0.1:4317';
const otlpEndpointRaw = (process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? defaultEndpoint)
  .replace('localhost', '127.0.0.1');
const otlpEndpoint = otlpEndpointRaw.replace(/\/+$/, '').replace(/\/v1\/(traces|metrics|logs)$/, '');

const scriptName = basename(process.argv[1] ?? 'unknown').replace(/\.(ts|js)$/, '');
const scriptPath = process.argv[1] ?? '';
const isQaScript =
  scriptPath.includes('/bin/qa/') ||
  scriptPath.includes('/scripts/ci/verify-playthrough-anomalies') ||
  scriptName.startsWith('simulate-') ||
  scriptName === 'api-playthrough' ||
  scriptName === 'verify-playthrough-anomalies';

const otelDisabled =
  process.env.OTEL_SDK_DISABLED === 'true' ||
  (process.env.CI === 'true' && !process.env.OTEL_EXPORTER_OTLP_ENDPOINT) ||
  (isQaScript && !process.env.OTEL_EXPORTER_OTLP_ENDPOINT);

// Ensure service name starts with 'phx-' and indicates the process
let serviceName = process.env.OTEL_SERVICE_NAME ?? `phx-${isQaScript ? 'qa' : 'cli'}-${scriptName}`;
if (!serviceName.startsWith('phx-')) {
  serviceName = `phx-${serviceName}`;
}
// If it's a generic name, add the script indicator
if (serviceName === 'phx-cli' || serviceName === 'phx-shell' || serviceName.includes('zdots')) {
  serviceName = `${serviceName}-${scriptName}`;
}

const deploymentEnvironment =
  process.env.APP_ENV?.trim() ?? process.env.NODE_ENV?.trim() ?? 'development';
const serviceInstanceId = `${hostname()}:${process.pid}:${scriptName}`;

const resource = resourceFromAttributes({
  [ATTR_SERVICE_NAME]: serviceName,
  'service.namespace': 'phalanxduel',
  'deployment.environment': deploymentEnvironment,
  'service.instance.id': serviceInstanceId,
});

function isOtelExporterConnectionError(err: unknown): boolean {
  if (!(err instanceof Error) || !('code' in err) || err.code !== 'ECONNREFUSED') {
    return false;
  }

  const otelUrl = new URL(otlpEndpoint);
  const port = 'port' in err ? String(err.port) : '';
  return port === otelUrl.port;
}

if (otelDisabled) {
  originalConsole.log('[instrument-cli] Telemetry disabled (CI/QA without OTEL endpoint or OTEL_SDK_DISABLED)');
} else {
// Configure Exporters
const traceExporter = isHttp 
  ? new HttpTraceExporter({ url: `${otlpEndpoint}/v1/traces` })
  : new GrpcTraceExporter({ url: otlpEndpoint });

const metricExporter = isHttp
  ? new HttpMetricExporter({ url: `${otlpEndpoint}/v1/metrics` })
  : new GrpcMetricExporter({ url: otlpEndpoint });

const logExporter = isHttp
  ? new HttpLogExporter({ url: `${otlpEndpoint}/v1/logs` })
  : new GrpcLogExporter({ url: otlpEndpoint });

// Initialize NodeSDK
const sdk = new NodeSDK({
  resource,
  traceExporter,
  metricReader: new PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: 5000,
  }),
  logRecordProcessor: new BatchLogRecordProcessor(logExporter),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false },
    }),
  ],
});

// Start the SDK
sdk.start();

const tracer = trace.getTracer('phx-cli');
const rootSpan = tracer.startSpan(`phx.cli.${scriptName}`, {
  attributes: {
    'cli.command': process.argv.join(' '),
    'cli.script': scriptName,
  },
});

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

// Use the logs API to get a logger for console capture
const otelLogger = logs.getLogger('phx-cli-logger', '1.0.0');

const emit = (severityNumber: SeverityNumber, severityText: string, args: unknown[]) => {
  try {
    const body = toMessage(args);
    if (body.includes('[instrument-cli]')) return;

    otelLogger.emit({
      severityNumber,
      severityText,
      body,
      context: context.active(),
    });
  } catch (err) {
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

// Shutdown logic
const shutdown = async () => {
  rootSpan.end();
  await sdk.shutdown();
};

process.on('SIGINT', async () => {
  rootSpan.setStatus({ code: SpanStatusCode.ERROR, message: 'SIGINT' });
  await shutdown();
  process.exit(0);
});

process.on('uncaughtException', async (err) => {
  if (isOtelExporterConnectionError(err)) {
    originalConsole.warn(
      `[instrument-cli] OTel collector unavailable at ${otlpEndpoint}; telemetry export skipped`,
    );
    return;
  }

  originalConsole.error('Uncaught Exception:', err);
  rootSpan.recordException(err);
  rootSpan.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
  await shutdown();
  process.exit(1);
});

process.on('beforeExit', shutdown);

originalConsole.log(`[instrument-cli] Telemetry active: ${serviceName} -> ${otlpEndpoint} (${protocol})`);
}
