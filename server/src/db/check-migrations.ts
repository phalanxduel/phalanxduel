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
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return;

  const sql = postgres(connectionString, { max: 1, connect_timeout: 5 });
  try {
    // 1. Check if the migrations table exists
    const tableExists = await sql`
      SELECT count(*)::int AS count
      FROM information_schema.tables
      WHERE table_name = '__drizzle_migrations'
    `;

    if ((tableExists[0]?.count ?? 0) === 0) {
      console.error(
        `\n❌ Migration table (__drizzle_migrations) does not exist.\n` +
          `   Run: pnpm --filter @phalanxduel/server db:migrate\n`,
      );
      process.exit(1);
    }

    // 2. Count how many migrations are applied
    const applied = await sql`SELECT count(*)::int AS count FROM drizzle.__drizzle_migrations`;
    const appliedCount = applied[0]?.count ?? 0;

    // 3. Count how many migration files exist
    const journal = JSON.parse(readFileSync(JOURNAL_PATH, 'utf8'));
    const expected = journal.entries.length;

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
