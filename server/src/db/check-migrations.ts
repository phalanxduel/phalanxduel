import { setTimeout as delay } from 'node:timers/promises';
import postgres from 'postgres';
import '../loadEnv.js';
import { loadMigrationFiles, MIGRATIONS_TABLE } from './migrations.js';

const connectionString = process.env.DATABASE_URL;

/**
 * Compares applied migrations in the DB against the local SQL migration files.
 * Exits the process with code 1 if any migrations are pending or drifted.
 * Silently passes when DATABASE_URL is not set (guest-only mode).
 */
export async function checkPendingMigrations(): Promise<void> {
  if (!connectionString) return;

  const maxAttempts = 5;
  let attempts = 0;
  let lastError: unknown = null;

  while (attempts < maxAttempts) {
    const sql = postgres(connectionString, { max: 1, connect_timeout: 5 });
    try {
      const tableExists = await sql`
        SELECT count(*)::int AS count
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = ${MIGRATIONS_TABLE}
      `;

      if ((tableExists[0]?.count ?? 0) === 0) {
        console.error(
          `\n❌ Migration table (public.${MIGRATIONS_TABLE}) does not exist.\n` +
            `   Run: pnpm --filter @phalanxduel/server db:migrate\n`,
        );
        process.exit(1);
      }

      const applied = await sql<
        { name: string; checksum: string }[]
      >`SELECT name, checksum FROM ${sql.unsafe(`public.${MIGRATIONS_TABLE}`)} ORDER BY name`;
      const appliedByName = new Map(applied.map((row) => [row.name, row.checksum]));
      const migrations = loadMigrationFiles();

      for (const migration of migrations) {
        const appliedChecksum = appliedByName.get(migration.name);
        if (!appliedChecksum) {
          console.error(
            `\n❌ Pending migration: ${migration.name}\n` +
              `   Run: pnpm --filter @phalanxduel/server db:migrate\n`,
          );
          process.exit(1);
        }

        if (appliedChecksum !== migration.checksum) {
          console.error(
            `\n❌ Migration drift detected for ${migration.name}.\n` +
              `   DB checksum: ${appliedChecksum}\n` +
              `   Local checksum: ${migration.checksum}\n` +
              `   Run: pnpm --filter @phalanxduel/server db:migrate\n`,
          );
          process.exit(1);
        }
      }

      return;
    } catch (err: unknown) {
      lastError = err;
      const errorWithCode = err as { code?: string };
      if (errorWithCode.code === 'ENOTFOUND' || errorWithCode.code === 'ECONNREFUSED') {
        attempts++;
        const waitMs = Math.min(1000 * Math.pow(2, attempts), 5000);
        console.warn(
          `[Migrations] Database not ready (${errorWithCode.code}), retrying in ${waitMs}ms... (Attempt ${attempts}/${maxAttempts})`,
        );
        await delay(waitMs);
      } else {
        throw err;
      }
    } finally {
      await sql.end();
    }
  }

  console.error(
    `[Migrations] Failed to connect to database after ${maxAttempts} attempts:`,
    lastError,
  );
  process.exit(1);
}
