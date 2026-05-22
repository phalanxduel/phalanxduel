import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import postgres from 'postgres';
import { runMigrations } from '../src/db/migrate.js';

describe('Migration Runner', () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    it.skip('DATABASE_URL not set, skipping migration tests');
    return;
  }

  // Hard stop: DROP SCHEMA is destructive. Only ever run against phalanxduel_test.
  const dbName =
    connectionString
      .replace(/[?#].*$/, '')
      .split('/')
      .pop() ?? '';
  if (dbName !== 'phalanxduel_test') {
    throw new Error(
      `SAFETY GUARD: migration tests resolved to database '${dbName}'. ` +
        `Only phalanxduel_test is allowed. DATABASE_URL=${connectionString}`,
    );
  }

  const sql = postgres(connectionString, { max: 1 });

  beforeAll(async () => {
    // Force a clean slate for the test environment to ensure migration isolation
    await sql`DROP SCHEMA IF EXISTS public CASCADE`;
    await sql`CREATE SCHEMA public`;
    await sql`GRANT ALL ON SCHEMA public TO public`;
  });

  afterAll(async () => {
    await sql.end();
  });

  it('should run all migrations successfully', async () => {
    await expect(runMigrations(sql)).resolves.not.toThrow();
  });

  it('should be idempotent (skip already applied)', async () => {
    await expect(runMigrations(sql)).resolves.not.toThrow();
  });

  it('should autoresolve "corrupted" checksum drift', async () => {
    // Manually mark a checksum as 'corrupted' in the DB
    await sql`UPDATE public.schema_migrations SET checksum = 'corrupted' WHERE name = '0000_baseline.sql'`;
    // Should now resolve successfully by re-syncing
    await expect(runMigrations(sql)).resolves.not.toThrow();

    // Verify it's actually fixed
    const result = await sql<
      { checksum: string }[]
    >`SELECT checksum FROM public.schema_migrations WHERE name = '0000_baseline.sql'`;
    expect(result[0]?.checksum).not.toBe('corrupted');
  });

  it('should still throw on unknown checksum drift', async () => {
    await sql`UPDATE public.schema_migrations SET checksum = 'tampered' WHERE name = '0000_baseline.sql'`;
    await expect(runMigrations(sql)).rejects.toThrow(/checksum drift/i);

    // Restore for hygiene so subsequent docs:routes doesn't fail
    await sql`UPDATE public.schema_migrations SET checksum = 'corrupted' WHERE name = '0000_baseline.sql'`;
    await runMigrations(sql); // This will autoresolve it to the correct value
  });
});
