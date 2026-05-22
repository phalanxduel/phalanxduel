import { describe, it, expect } from 'vitest';
import postgres from 'postgres';

describe('Database environment isolation', () => {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    it.skip('DATABASE_URL not set, skipping DB isolation tests');
    return;
  }

  // Strip query string and extract the database name from the URL path.
  const dbName =
    connectionString
      .replace(/[?#].*$/, '')
      .split('/')
      .pop() ?? '';

  // Extract the connecting user (postgresql://user:pass@host/db or postgresql://user@host/db).
  const userMatch = connectionString.match(/^postgresql?:\/\/([^:@/]+)/);
  const dbUser = userMatch?.[1] ?? '';

  // Derive the host+port from the current URL so cross-connection tests use
  // the same network path (works for both localhost and Docker host aliases).
  const hostMatch = connectionString.replace(/[?#].*$/, '').match(/^postgresql?:\/\/[^@]+@([^/]+)/);
  const hostPort = hostMatch?.[1] ?? 'localhost:5432';

  it('DATABASE_URL must target phalanxduel_test when the test suite runs', () => {
    expect(
      dbName,
      `DATABASE_URL resolves to '${dbName}' — tests must run via with-test-postgres.sh which ` +
        `targets phalanxduel_test. Current URL: ${connectionString}`,
    ).toBe('phalanxduel_test');
  });

  it('DATABASE_URL must use the phalanx_test role', () => {
    expect(
      dbUser,
      `DATABASE_URL uses role '${dbUser}' — tests must connect as phalanx_test. ` +
        `Current URL: ${connectionString}`,
    ).toBe('phalanx_test');
  });

  it('phalanx_test credentials are rejected by phalanxduel_development', async () => {
    const wrongUrl = `postgresql://phalanx_test:phx_test_local@${hostPort}/phalanxduel_development`;
    const sql = postgres(wrongUrl, { max: 1, connect_timeout: 5 });
    try {
      // Either "permission denied for database" (local — CONNECT revoked from PUBLIC)
      // or "database does not exist" (CI ephemeral postgres) — both mean access is blocked.
      await expect(sql`SELECT 1`).rejects.toThrow();
    } finally {
      await sql.end({ timeout: 1 }).catch(() => undefined);
    }
  });

  it('phalanx_dev credentials are rejected by phalanxduel_test', async () => {
    const wrongUrl = `postgresql://phalanx_dev:phx_dev_local@${hostPort}/phalanxduel_test`;
    const sql = postgres(wrongUrl, { max: 1, connect_timeout: 5 });
    try {
      // Either "permission denied for database" (local) or "role does not exist" (CI
      // where phalanx_dev is never created) — both mean access is blocked.
      await expect(sql`SELECT 1`).rejects.toThrow();
    } finally {
      await sql.end({ timeout: 1 }).catch(() => undefined);
    }
  });

  it('phalanx_test can connect to and query phalanxduel_test', async () => {
    const sql = postgres(connectionString, { max: 1 });
    try {
      const result = await sql<{ db: string; usr: string }[]>`
        SELECT current_database() AS db, current_user AS usr
      `;
      expect(result[0]?.db).toBe('phalanxduel_test');
      expect(result[0]?.usr).toBe('phalanx_test');
    } finally {
      await sql.end();
    }
  });
});
