/**
 * Lightweight OpenTelemetry instrumentation for Phalanx CLI tools.
 * Routes traces and metrics to the local OTel collector.
 */

import { metrics, trace, SpanStatusCode } from '@opentelemetry/api';
import { BatchSpanProcessor, NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { MeterProvider, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { basename } from 'node:path';

const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://127.0.0.1:4318';
const serviceName = process.env.OTEL_SERVICE_NAME ?? 'phalanx-cli';

const resource = resourceFromAttributes({
  [ATTR_SERVICE_NAME]: serviceName,
});

// Initialize Tracing
const traceExporter = new OTLPTraceExporter({
  url: `${otlpEndpoint.replace(/\/+$/, '')}/v1/traces`,
});

const tracerProvider = new NodeTracerProvider({
  resource,
  spanProcessors: [new BatchSpanProcessor(traceExporter)],
});
tracerProvider.register();

// Initialize Metrics
const metricExporter = new OTLPMetricExporter({
  url: `${otlpEndpoint.replace(/\/+$/, '')}/v1/metrics`,
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

// ── Root Span for Command Execution ──────────────────────────────────
const tracer = trace.getTracer('phalanx-cli');
const scriptName = basename(process.argv[1] ?? 'unknown');
const rootSpan = tracer.startSpan(`cli.${scriptName}`, {
  attributes: {
    'cli.command': process.argv.join(' '),
    'cli.script': scriptName,
  },
});

// Flush and end span on exit
const shutdown = async () => {
  rootSpan.end();
  await Promise.all([tracerProvider.forceFlush(), meterProvider.forceFlush()]);
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
