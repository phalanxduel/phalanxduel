import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('observability helpers', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('records span failures and always ends the span', async () => {
    const span = {
      recordException: vi.fn(),
      setStatus: vi.fn(),
      end: vi.fn(),
    };
    const startActiveSpan = vi.fn((_name, _options, callback) => callback(span));

    vi.doMock('@opentelemetry/api', () => ({
      metrics: {
        getMeter: () => ({
          createCounter: vi.fn(),
          createHistogram: vi.fn(),
          createObservableGauge: vi.fn(() => ({ addCallback: vi.fn() })),
        }),
      },
      trace: {
        getTracer: () => ({
          startActiveSpan,
        }),
      },
      SpanStatusCode: {
        ERROR: 2,
      },
    }));

    const { withActiveSpan } = await import('../src/observability.js');

    await expect(
      withActiveSpan('game.action', { attributes: { 'match.id': 'match-1' } }, async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    expect(startActiveSpan).toHaveBeenCalledWith(
      'game.action',
      { attributes: { 'match.id': 'match-1' } },
      expect.any(Function),
    );
    expect(span.recordException).toHaveBeenCalledWith(expect.any(Error));
    expect(span.setStatus).toHaveBeenCalledWith({ code: 2, message: 'boom' });
    expect(span.end).toHaveBeenCalledTimes(1);
  });

  it('wraps counter, histogram, and mutable gauge instruments', async () => {
    const counterAdd = vi.fn();
    const histogramRecord = vi.fn();
    let gaugeCallback:
      | ((result: { observe: (value: number, attributes?: object) => void }) => void)
      | undefined;

    const createCounter = vi.fn(() => ({ add: counterAdd }));
    const createHistogram = vi.fn(() => ({ record: histogramRecord }));
    const createObservableGauge = vi.fn(() => ({
      addCallback: vi.fn((callback) => {
        gaugeCallback = callback;
      }),
    }));

    vi.doMock('@opentelemetry/api', () => ({
      metrics: {
        getMeter: () => ({
          createCounter,
          createHistogram,
          createObservableGauge,
        }),
      },
      trace: {
        getTracer: () => ({
          startActiveSpan: vi.fn(),
        }),
      },
      SpanStatusCode: {
        ERROR: 2,
      },
    }));

    const {
      createCounter: makeCounter,
      createHistogram: makeHistogram,
      createMutableGauge,
    } = await import('../src/observability.js');

    const counter = makeCounter('game.outcome', { description: 'Completed games.' });
    counter.add(1, { winner: '0' });
    expect(createCounter).toHaveBeenCalledWith('game.outcome', {
      description: 'Completed games.',
    });
    expect(counterAdd).toHaveBeenCalledWith(1, { winner: '0' });

    const histogram = makeHistogram('system.actions_duration_ms', { unit: 'ms' });
    histogram.record(42, { 'action.type': 'deploy' });
    expect(createHistogram).toHaveBeenCalledWith('system.actions_duration_ms', { unit: 'ms' });
    expect(histogramRecord).toHaveBeenCalledWith(42, { 'action.type': 'deploy' });

    const gauge = createMutableGauge('system.matches_active', {
      description: 'Current active matches.',
    });
    gauge.add(2);
    gauge.set(5, { mode: 'local' });

    const observe = vi.fn();
    gaugeCallback?.({ observe });
    expect(createObservableGauge).toHaveBeenCalledWith('system.matches_active', {
      description: 'Current active matches.',
    });
    expect(observe).toHaveBeenCalledWith(5, { mode: 'local' });
  });

  it('returns result and ends span on sync callback success', async () => {
    const span = {
      recordException: vi.fn(),
      setStatus: vi.fn(),
      end: vi.fn(),
    };
    const startActiveSpan = vi.fn((_name, _options, callback) => callback(span));

    vi.doMock('@opentelemetry/api', () => ({
      metrics: {
        getMeter: () => ({
          createCounter: vi.fn(),
          createHistogram: vi.fn(),
          createObservableGauge: vi.fn(() => ({ addCallback: vi.fn() })),
        }),
      },
      trace: {
        getTracer: () => ({
          startActiveSpan,
        }),
      },
      SpanStatusCode: { ERROR: 2 },
    }));

    const { withActiveSpan } = await import('../src/observability.js');

    const result = await withActiveSpan('ws.createMatch', {}, () => {
      return { matchId: 'abc' };
    });

    expect(result).toEqual({ matchId: 'abc' });
    expect(span.end).toHaveBeenCalledTimes(1);
    expect(span.recordException).not.toHaveBeenCalled();
    expect(span.setStatus).not.toHaveBeenCalled();
  });

  it('returns result and ends span on async callback success', async () => {
    const span = {
      recordException: vi.fn(),
      setStatus: vi.fn(),
      end: vi.fn(),
    };
    const startActiveSpan = vi.fn((_name, _options, callback) => callback(span));

    vi.doMock('@opentelemetry/api', () => ({
      metrics: {
        getMeter: () => ({
          createCounter: vi.fn(),
          createHistogram: vi.fn(),
          createObservableGauge: vi.fn(() => ({ addCallback: vi.fn() })),
        }),
      },
      trace: {
        getTracer: () => ({
          startActiveSpan,
        }),
      },
      SpanStatusCode: { ERROR: 2 },
    }));

    const { withActiveSpan } = await import('../src/observability.js');

    const result = await withActiveSpan('game.action', {}, async () => {
      return 42;
    });

    expect(result).toBe(42);
    expect(span.end).toHaveBeenCalledTimes(1);
    expect(span.recordException).not.toHaveBeenCalled();
  });

  it('mutable gauge add without attributes preserves prior attributes', async () => {
    let gaugeCallback: ((result: { observe: (v: number, a?: object) => void }) => void) | undefined;

    vi.doMock('@opentelemetry/api', () => ({
      metrics: {
        getMeter: () => ({
          createCounter: vi.fn(() => ({ add: vi.fn() })),
          createHistogram: vi.fn(() => ({ record: vi.fn() })),
          createObservableGauge: vi.fn(() => ({
            addCallback: vi.fn((cb) => {
              gaugeCallback = cb;
            }),
          })),
        }),
      },
      trace: {
        getTracer: () => ({
          startActiveSpan: vi.fn(),
        }),
      },
      SpanStatusCode: { ERROR: 2 },
    }));

    const { createMutableGauge } = await import('../src/observability.js');

    const gauge = createMutableGauge('system.ws_connections', {
      description: 'Active connections.',
    });

    // Set with attributes
    gauge.set(10, { region: 'us-east' });
    // Add without attributes — should preserve region attribute
    gauge.add(3);

    const observe = vi.fn();
    gaugeCallback?.({ observe });
    expect(observe).toHaveBeenCalledWith(13, { region: 'us-east' });
  });

  it('mutable gauge set without attributes clears prior attributes', async () => {
    let gaugeCallback: ((result: { observe: (v: number, a?: object) => void }) => void) | undefined;

    vi.doMock('@opentelemetry/api', () => ({
      metrics: {
        getMeter: () => ({
          createCounter: vi.fn(() => ({ add: vi.fn() })),
          createHistogram: vi.fn(() => ({ record: vi.fn() })),
          createObservableGauge: vi.fn(() => ({
            addCallback: vi.fn((cb) => {
              gaugeCallback = cb;
            }),
          })),
        }),
      },
      trace: {
        getTracer: () => ({
          startActiveSpan: vi.fn(),
        }),
      },
      SpanStatusCode: { ERROR: 2 },
    }));

    const { createMutableGauge } = await import('../src/observability.js');

    const gauge = createMutableGauge('system.ws_connections', {
      description: 'Active connections.',
    });

    gauge.set(10, { region: 'us-east' });
    // set() without attributes should clear them
    gauge.set(5);

    const observe = vi.fn();
    gaugeCallback?.({ observe });
    expect(observe).toHaveBeenCalledWith(5, undefined);
  });
});
