import { NodeSDK } from '@opentelemetry/sdk-node';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-node';
import {
  PeriodicExportingMetricReader,
  ConsoleMetricExporter,
} from '@opentelemetry/sdk-metrics';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { Resource } from '@opentelemetry/resources';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';

const otlpEndpoint = process.env['OTEL_EXPORTER_OTLP_ENDPOINT'];
const isOtlpEnabled = !!otlpEndpoint;

const traceExporter = isOtlpEnabled
  ? new OTLPTraceExporter({ url: `${otlpEndpoint}/v1/traces` })
  : new ConsoleSpanExporter();

const metricReader = new PeriodicExportingMetricReader({
  exporter: isOtlpEnabled
    ? new OTLPMetricExporter({ url: `${otlpEndpoint}/v1/metrics` })
    : new ConsoleMetricExporter(),
  exportIntervalMillis: isOtlpEnabled ? 10_000 : 60_000,
});

const sdk = new NodeSDK({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: 'phalanx-server',
    [ATTR_SERVICE_VERSION]: '0.1.0',
  }),
  traceExporter,
  metricReader,
  instrumentations: [new HttpInstrumentation()],
});

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
