import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const __dirname = dirname(fileURLToPath(import.meta.url));
const JOURNAL_PATH = resolve(__dirname, '../../drizzle/meta/_journal.json');

/**
 * Compares applied migrations in the DB against the local Drizzle journal.
 * Exits the process with code 1 if any migrations are pending.
 * Silently passes when DATABASE_URL is not set (guest-only mode).
 */
export async function checkPendingMigrations(): Promise<void> {
  const connectionString = process.env['DATABASE_URL'];
  if (!connectionString) return;

  const journal = JSON.parse(readFileSync(JOURNAL_PATH, 'utf8')) as {
    entries: unknown[];
  };
  const expected = journal.entries.length;

  const sql = postgres(connectionString, { max: 1, connect_timeout: 5 });
  try {
    const tableExists = await sql`
      SELECT count(*)::int AS count
      FROM information_schema.tables
      WHERE table_schema = 'drizzle'
        AND table_name = '__drizzle_migrations'
    `;

    if (tableExists[0]!.count === 0) {
      console.error(
        `\n❌ No migrations applied (${expected} pending).\n` +
          `   Run: pnpm --filter @phalanxduel/server db:migrate\n`,
      );
      process.exit(1);
    }

    const applied = await sql`
      SELECT count(*)::int AS count FROM "drizzle"."__drizzle_migrations"
    `;

    const appliedCount = applied[0]!.count as number;
    if (appliedCount < expected) {
      const pending = expected - appliedCount;
      console.error(
        `\n❌ ${pending} pending migration(s) (${appliedCount}/${expected} applied).\n` +
          `   Run: pnpm --filter @phalanxduel/server db:migrate\n`,
      );
      process.exit(1);
    }
  } finally {
    await sql.end();
  }
}
