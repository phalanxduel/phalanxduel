import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('metrics helpers', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('trackProcess returns the result from the wrapped function', async () => {
    const withActiveSpan = vi.fn(async (_name, _options, callback) => callback({ end: vi.fn() }));

    vi.doMock('../src/observability.js', () => ({
      withActiveSpan,
      createCounter: vi.fn(() => ({ add: vi.fn() })),
      createHistogram: vi.fn(() => ({ record: vi.fn() })),
      createMutableGauge: vi.fn(() => ({ set: vi.fn(), add: vi.fn() })),
    }));

    const { trackProcess } = await import('../src/metrics.js');

    const result = await trackProcess('game.action', { 'action.type': 'deploy' }, async () => ({
      outcome: 'win',
    }));

    expect(result).toEqual({ outcome: 'win' });
    expect(withActiveSpan).toHaveBeenCalledWith(
      'game.action',
      { attributes: { 'action.type': 'deploy' } },
      expect.any(Function),
    );
  });

  it('trackProcess passes span to withActiveSpan but fn receives no span', async () => {
    let spanReceivedByWithActiveSpan: unknown;
    const mockSpan = { end: vi.fn(), setAttribute: vi.fn() };

    const withActiveSpan = vi.fn(async (_name, _options, callback) => {
      spanReceivedByWithActiveSpan = mockSpan;
      return callback(mockSpan);
    });

    vi.doMock('../src/observability.js', () => ({
      withActiveSpan,
      createCounter: vi.fn(() => ({ add: vi.fn() })),
      createHistogram: vi.fn(() => ({ record: vi.fn() })),
      createMutableGauge: vi.fn(() => ({ set: vi.fn(), add: vi.fn() })),
    }));

    const { trackProcess } = await import('../src/metrics.js');

    await trackProcess('system.cleanup', { reason: 'timeout' }, () => 'done');

    expect(spanReceivedByWithActiveSpan).toBe(mockSpan);
  });

  it('matchLifecycleTotal.add passes event as attribute', async () => {
    const counterAdd = vi.fn();

    vi.doMock('../src/observability.js', () => ({
      withActiveSpan: vi.fn(),
      createCounter: vi.fn(() => ({ add: counterAdd })),
      createHistogram: vi.fn(() => ({ record: vi.fn() })),
      createMutableGauge: vi.fn(() => ({ set: vi.fn(), add: vi.fn() })),
    }));

    const { matchLifecycleTotal } = await import('../src/metrics.js');

    matchLifecycleTotal.add('created');
    expect(counterAdd).toHaveBeenCalledWith(1, { event: 'created' });

    matchLifecycleTotal.add('abandoned');
    expect(counterAdd).toHaveBeenCalledWith(1, { event: 'abandoned' });
  });
});
