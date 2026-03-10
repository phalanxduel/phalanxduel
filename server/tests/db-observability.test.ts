import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('db observability helpers', () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env['DATABASE_URL'];
  });

  it('wraps database queries with client span attributes', async () => {
    process.env['DATABASE_URL'] = 'postgres://phalanx:secret@db.internal:5433/phalanx';
    const withActiveSpan = vi.fn(async (_name, _options, callback) => callback({ end: vi.fn() }));

    vi.doMock('../src/observability.js', () => ({
      withActiveSpan,
    }));

    const { traceDbQuery } = await import('../src/db/observability.js');

    const result = await traceDbQuery(
      'db.users.select_by_email',
      {
        operation: 'SELECT',
        table: 'users',
      },
      async () => 'ok',
    );

    expect(result).toBe('ok');
    expect(withActiveSpan).toHaveBeenCalledWith(
      'db.users.select_by_email',
      {
        attributes: {
          'db.collection.name': 'users',
          'db.namespace': 'phalanx',
          'db.system': 'postgresql',
          'db.operation.name': 'SELECT',
          'db.system.name': 'postgresql',
          'server.address': 'db.internal',
          'server.port': 5433,
        },
        kind: 2,
      },
      expect.any(Function),
    );
  });

  it('wraps database transactions through the query helper', async () => {
    process.env['DATABASE_URL'] = 'postgres://phalanx:secret@db.internal:5433/phalanx';
    const spanResult = { ok: true };
    const withActiveSpan = vi.fn(async (_name, _options, callback) => callback({ end: vi.fn() }));

    vi.doMock('../src/observability.js', () => ({
      withActiveSpan,
    }));

    const { traceDbTransaction } = await import('../src/db/observability.js');

    const result = await traceDbTransaction('db.users.transaction', async () => spanResult, {
      attempt: 1,
    });

    expect(result).toBe(spanResult);
    expect(withActiveSpan).toHaveBeenCalledWith(
      'db.users.transaction',
      {
        attributes: {
          attempt: 1,
          'db.namespace': 'phalanx',
          'db.operation.name': 'TRANSACTION',
          'db.system': 'postgresql',
          'db.system.name': 'postgresql',
          'server.address': 'db.internal',
          'server.port': 5433,
        },
        kind: 2,
      },
      expect.any(Function),
    );
  });
});
