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

    await traceWsMessage('joinMatch', { 'match.id': 'm-1' }, undefined, () => 'ok');

    expect(withActiveSpan).toHaveBeenCalledWith(
      'ws.joinMatch',
      {
        attributes: {
          'http.route': '/ws',
          'match.id': 'm-1',
          'network.protocol.name': 'websocket',
        },
        kind: 1,
      },
      expect.any(Function),
    );
  });

  it('traceHttpHandler prefixes span name with http. and sets server span kind', async () => {
    const withActiveSpan = vi.fn(async (_name, _options, callback) => callback({ end: vi.fn() }));

    vi.doMock('../src/observability.js', () => ({
      withActiveSpan,
    }));

    const { traceHttpHandler } = await import('../src/tracing.js');

    await traceHttpHandler('createMatch', () => ({ matchId: 'abc' }));

    expect(withActiveSpan).toHaveBeenCalledWith(
      'http.createMatch',
      { attributes: {}, kind: 1 },
      expect.any(Function),
    );
  });

  it('traceHttpHandler records response status when a trace context provides it', async () => {
    const span = {
      end: vi.fn(),
      setAttribute: vi.fn(),
    };
    const withActiveSpan = vi.fn(async (_name, _options, callback) => callback(span));

    vi.doMock('../src/observability.js', () => ({
      withActiveSpan,
    }));

    const { traceHttpHandler } = await import('../src/tracing.js');

    await traceHttpHandler(
      'createMatch',
      {
        attributes: { 'http.route': '/matches' },
        getStatusCode: () => 201,
      },
      () => ({ matchId: 'abc' }),
    );

    expect(span.setAttribute).toHaveBeenCalledWith('http.response.status_code', 201);
  });

  it('httpRequestAttributes derives semantic HTTP attributes from the request', async () => {
    vi.doMock('../src/observability.js', () => ({
      withActiveSpan: vi.fn(),
    }));

    const { httpRequestAttributes } = await import('../src/tracing.js');

    const attributes = httpRequestAttributes({
      headers: { host: '127.0.0.1:3001' },
      hostname: '127.0.0.1',
      method: 'POST',
      routeOptions: { url: '/matches' } as { url: string },
      url: '/matches?seed=1',
    });

    expect(attributes).toEqual({
      'http.request.method': 'POST',
      'http.route': '/matches',
      'network.protocol.name': 'http',
      'server.address': '127.0.0.1',
      'server.port': 3001,
      'url.path': '/matches',
    });
  });

  it('httpTraceContext combines request attributes with reply status lookup', async () => {
    vi.doMock('../src/observability.js', () => ({
      withActiveSpan: vi.fn(),
    }));

    const { httpTraceContext } = await import('../src/tracing.js');

    const context = httpTraceContext(
      {
        headers: { host: '127.0.0.1:3001' },
        hostname: '127.0.0.1',
        method: 'GET',
        routeOptions: { url: '/health' } as { url: string },
        url: '/health',
      },
      { statusCode: 204 },
    );

    expect(context.attributes).toEqual({
      'http.request.method': 'GET',
      'http.route': '/health',
      'network.protocol.name': 'http',
      'server.address': '127.0.0.1',
      'server.port': 3001,
      'url.path': '/health',
    });
    expect(context.getStatusCode?.()).toBe(204);
  });

  it('traceWsMessage returns result from sync callback', async () => {
    const withActiveSpan = vi.fn(async (_name, _options, callback) => callback({ end: vi.fn() }));

    vi.doMock('../src/observability.js', () => ({
      withActiveSpan,
    }));

    const { traceWsMessage } = await import('../src/tracing.js');

    const result = await traceWsMessage('createMatch', {}, undefined, () => {
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

    const result = await traceWsMessage(
      'joinMatch',
      { 'match.id': 'm-1' },
      undefined,
      async (span) => {
        span.setAttribute?.('player.id', 'p-1');
        return { playerId: 'p-1' };
      },
    );

    expect(result).toEqual({ playerId: 'p-1' });
  });

  it('traceWsMessage adds telemetry carrier attributes when present', async () => {
    const withActiveSpan = vi.fn(async (_name, _options, callback) => callback({ end: vi.fn() }));

    vi.doMock('../src/observability.js', () => ({
      withActiveSpan,
    }));

    const { traceWsMessage } = await import('../src/tracing.js');

    await traceWsMessage(
      'action',
      { 'match.id': 'm-2' },
      { qaRunId: 'qa-1', originService: 'phx-qa-api-playthrough' },
      () => 'ok',
    );

    expect(withActiveSpan).toHaveBeenCalledWith(
      'ws.action',
      {
        attributes: {
          'http.route': '/ws',
          'match.id': 'm-2',
          'network.protocol.name': 'websocket',
          'qa.run_id': 'qa-1',
          'ws.origin_service': 'phx-qa-api-playthrough',
        },
        kind: 1,
      },
      expect.any(Function),
    );
  });
});
