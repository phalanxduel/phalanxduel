import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('tracing helpers', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('traceWsMessage prefixes span name with ws. and passes attributes', async () => {
    const withActiveSpan = vi.fn(async (_name, _options, callback) => callback({ end: vi.fn() }));

    vi.doMock('../src/observability.js', () => ({
      withActiveSpan,
    }));

    const { traceWsMessage } = await import('../src/tracing.js');

    await traceWsMessage('joinMatch', { 'match.id': 'm-1' }, () => 'ok');

    expect(withActiveSpan).toHaveBeenCalledWith(
      'ws.joinMatch',
      { attributes: { 'match.id': 'm-1' } },
      expect.any(Function),
    );
  });

  it('traceHttpHandler prefixes span name with http. and passes empty attributes', async () => {
    const withActiveSpan = vi.fn(async (_name, _options, callback) => callback({ end: vi.fn() }));

    vi.doMock('../src/observability.js', () => ({
      withActiveSpan,
    }));

    const { traceHttpHandler } = await import('../src/tracing.js');

    await traceHttpHandler('createMatch', () => ({ matchId: 'abc' }));

    expect(withActiveSpan).toHaveBeenCalledWith('http.createMatch', {}, expect.any(Function));
  });

  it('traceWsMessage returns result from sync callback', async () => {
    const withActiveSpan = vi.fn(async (_name, _options, callback) => callback({ end: vi.fn() }));

    vi.doMock('../src/observability.js', () => ({
      withActiveSpan,
    }));

    const { traceWsMessage } = await import('../src/tracing.js');

    const result = await traceWsMessage('createMatch', {}, () => {
      return { matchId: 'xyz' };
    });

    expect(result).toEqual({ matchId: 'xyz' });
  });

  it('traceWsMessage returns result from async callback', async () => {
    const withActiveSpan = vi.fn(async (_name, _options, callback) => callback({ end: vi.fn() }));

    vi.doMock('../src/observability.js', () => ({
      withActiveSpan,
    }));

    const { traceWsMessage } = await import('../src/tracing.js');

    const result = await traceWsMessage('joinMatch', { 'match.id': 'm-1' }, async (span) => {
      span.setAttribute?.('player.id', 'p-1');
      return { playerId: 'p-1' };
    });

    expect(result).toEqual({ playerId: 'p-1' });
  });
});
