/**
 * Integration test: verifies that OTel-native spans and metrics actually record
 * through the real SDK pipeline (in-memory exporters, no network).
 *
 * Unlike the unit tests that mock the OTel API, this boots real providers
 * to catch misconfigured registrations and silent no-op failures.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { metrics } from '@opentelemetry/api';
import {
  InMemorySpanExporter,
  SimpleSpanProcessor,
  NodeTracerProvider,
} from '@opentelemetry/sdk-trace-node';
import {
  InMemoryMetricExporter,
  MeterProvider,
  PeriodicExportingMetricReader,
  AggregationTemporality,
} from '@opentelemetry/sdk-metrics';

let spanExporter: InMemorySpanExporter;
let metricExporter: InMemoryMetricExporter;
let tracerProvider: NodeTracerProvider;
let meterProvider: MeterProvider;
let metricReader: PeriodicExportingMetricReader;

beforeAll(() => {
  spanExporter = new InMemorySpanExporter();
  tracerProvider = new NodeTracerProvider({
    spanProcessors: [new SimpleSpanProcessor(spanExporter)],
  });
  tracerProvider.register();

  metricExporter = new InMemoryMetricExporter(AggregationTemporality.CUMULATIVE);
  metricReader = new PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: 100,
  });
  meterProvider = new MeterProvider({
    readers: [metricReader],
  });
  metrics.setGlobalMeterProvider(meterProvider);
});

afterAll(async () => {
  await tracerProvider.shutdown();
  await meterProvider.shutdown();
});

describe('OTel integration: spans', () => {
  it('withActiveSpan records a span with attributes through the real SDK', async () => {
    // Dynamic import AFTER providers are registered so observability.ts
    // picks up the real tracer/meter.
    const { withActiveSpan } = await import('../src/observability.js');

    const result = await withActiveSpan(
      'test.integration',
      { attributes: { 'test.key': 'test-value' } },
      (span) => {
        span.setAttribute('extra', 42);
        return 'hello';
      },
    );

    expect(result).toBe('hello');

    const spans = spanExporter.getFinishedSpans();
    const testSpan = spans.find((s) => s.name === 'test.integration');
    expect(testSpan).toBeDefined();
    expect(testSpan!.attributes['test.key']).toBe('test-value');
    expect(testSpan!.attributes['extra']).toBe(42);
    expect(testSpan!.status.code).toBe(0); // UNSET = success
  });

  it('withActiveSpan records error status on the real span', async () => {
    const { withActiveSpan } = await import('../src/observability.js');

    await expect(
      withActiveSpan('test.error', {}, async () => {
        throw new Error('integration-boom');
      }),
    ).rejects.toThrow('integration-boom');

    const spans = spanExporter.getFinishedSpans();
    const errorSpan = spans.find((s) => s.name === 'test.error');
    expect(errorSpan).toBeDefined();
    expect(errorSpan!.status.code).toBe(2); // ERROR
    expect(errorSpan!.status.message).toBe('integration-boom');
    expect(errorSpan!.events.length).toBeGreaterThan(0); // recordException creates an event
  });

  it('traceWsMessage creates a ws-prefixed span through the real SDK', async () => {
    const { traceWsMessage } = await import('../src/tracing.js');

    const result = await traceWsMessage(
      'joinMatch',
      { 'match.id': 'match-integration' },
      (span) => {
        span.setAttribute('player.id', 'p-1');
        return { joined: true };
      },
    );

    expect(result).toEqual({ joined: true });

    const spans = spanExporter.getFinishedSpans();
    const wsSpan = spans.find((s) => s.name === 'ws.joinMatch');
    expect(wsSpan).toBeDefined();
    expect(wsSpan!.attributes['match.id']).toBe('match-integration');
    expect(wsSpan!.attributes['player.id']).toBe('p-1');
  });

  it('traceHttpHandler creates an http-prefixed span through the real SDK', async () => {
    const { traceHttpHandler } = await import('../src/tracing.js');

    const result = await traceHttpHandler('createMatch', (span) => {
      span.setAttribute('match.id', 'm-http');
      return { matchId: 'm-http' };
    });

    expect(result).toEqual({ matchId: 'm-http' });

    const spans = spanExporter.getFinishedSpans();
    const httpSpan = spans.find((s) => s.name === 'http.createMatch');
    expect(httpSpan).toBeDefined();
    expect(httpSpan!.attributes['match.id']).toBe('m-http');
  });
});

describe('OTel integration: metrics', () => {
  it('createCounter records values through the real SDK', async () => {
    const { createCounter } = await import('../src/observability.js');

    const counter = createCounter('test.integration.counter', {
      description: 'Integration test counter.',
    });
    counter.add(1, { action: 'deploy' });
    counter.add(3, { action: 'attack' });

    // Force a metric collection cycle
    await metricReader.forceFlush();

    const resourceMetrics = metricExporter.getMetrics();
    expect(resourceMetrics.length).toBeGreaterThan(0);

    const allMetrics = resourceMetrics.flatMap((rm) => rm.scopeMetrics.flatMap((sm) => sm.metrics));
    const testCounter = allMetrics.find((m) => m.descriptor.name === 'test.integration.counter');
    expect(testCounter).toBeDefined();
    expect(testCounter!.descriptor.description).toBe('Integration test counter.');
  });

  it('createHistogram records values through the real SDK', async () => {
    const { createHistogram } = await import('../src/observability.js');

    const histogram = createHistogram('test.integration.duration', {
      description: 'Integration test histogram.',
      unit: 'ms',
    });
    histogram.record(42);
    histogram.record(100);

    await metricReader.forceFlush();

    const resourceMetrics = metricExporter.getMetrics();
    const allMetrics = resourceMetrics.flatMap((rm) => rm.scopeMetrics.flatMap((sm) => sm.metrics));
    const testHistogram = allMetrics.find((m) => m.descriptor.name === 'test.integration.duration');
    expect(testHistogram).toBeDefined();
    expect(testHistogram!.descriptor.unit).toBe('ms');
  });

  it('createMutableGauge reports current value through the real SDK', async () => {
    const { createMutableGauge } = await import('../src/observability.js');

    const gauge = createMutableGauge('test.integration.gauge', {
      description: 'Integration test gauge.',
    });
    gauge.set(10);
    gauge.add(5);

    await metricReader.forceFlush();

    const resourceMetrics = metricExporter.getMetrics();
    const allMetrics = resourceMetrics.flatMap((rm) => rm.scopeMetrics.flatMap((sm) => sm.metrics));
    const testGauge = allMetrics.find((m) => m.descriptor.name === 'test.integration.gauge');
    expect(testGauge).toBeDefined();
  });
});
