import {
  metrics,
  trace,
  SpanKind,
  SpanStatusCode,
  type Attributes,
  type Span,
} from '@opentelemetry/api';

const OTEL_SCOPE = 'phalanx-server';

const tracer = trace.getTracer(OTEL_SCOPE);
const meter = metrics.getMeter(OTEL_SCOPE);

interface MetricOptions {
  description?: string;
  unit?: string;
}

interface ActiveSpanOptions {
  attributes?: Attributes;
  kind?: SpanKind;
}

export interface CounterMetric {
  add(value: number, attributes?: Attributes): void;
}

export interface HistogramMetric {
  record(value: number, attributes?: Attributes): void;
}

export interface MutableGaugeMetric {
  set(value: number, attributes?: Attributes): void;
  add(value: number, attributes?: Attributes): void;
}

export async function withActiveSpan<T>(
  name: string,
  options: ActiveSpanOptions = {},
  fn: (span: Span) => Promise<T> | T,
): Promise<T> {
  return tracer.startActiveSpan(
    name,
    {
      attributes: options.attributes,
      kind: options.kind,
    },
    async (span) => {
      try {
        return await fn(span);
      } catch (error) {
        span.recordException(error instanceof Error ? error : String(error));
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : String(error),
        });
        throw error;
      } finally {
        span.end();
      }
    },
  );
}

export function createCounter(name: string, options?: MetricOptions): CounterMetric {
  const counter = meter.createCounter(name, options);
  return {
    add(value: number, attributes?: Attributes) {
      counter.add(value, attributes);
    },
  };
}

export function createHistogram(name: string, options?: MetricOptions): HistogramMetric {
  const histogram = meter.createHistogram(name, options);
  return {
    record(value: number, attributes?: Attributes) {
      histogram.record(value, attributes);
    },
  };
}

export function createMutableGauge(name: string, options?: MetricOptions): MutableGaugeMetric {
  let currentValue = 0;
  let currentAttributes: Attributes | undefined;

  const gauge = meter.createObservableGauge(name, options);
  gauge.addCallback((observableResult) => {
    observableResult.observe(currentValue, currentAttributes);
  });

  return {
    set(value: number, attributes?: Attributes) {
      currentValue = value;
      currentAttributes = attributes;
    },
    add(value: number, attributes?: Attributes) {
      currentValue += value;
      if (attributes) {
        currentAttributes = attributes;
      }
    },
  };
}
