import { readdirSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import postgres from 'postgres';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Admin shares the server's migrations — resolve via monorepo layout.
const MIGRATIONS_DIR = resolve(__dirname, '../../../server/migrations');
const MIGRATIONS_TABLE = 'schema_migrations';

function checksum(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

/**
 * Compares applied migrations in the DB against the server's SQL migration files.
 * Exits the process with code 1 if any migrations are pending or drifted.
 */
export async function checkPendingMigrations(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('\n❌ DATABASE_URL is not set. Admin requires a database connection.\n');
    process.exit(1);
  }

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
    >`SELECT name, checksum FROM public.schema_migrations ORDER BY name`;
    const appliedByName = new Map(applied.map((row) => [row.name, row.checksum]));

    const migrationFiles = readdirSync(MIGRATIONS_DIR)
      .filter((entry) => entry.endsWith('.sql'))
      .sort((a, b) => a.localeCompare(b));

    for (const name of migrationFiles) {
      const path = resolve(MIGRATIONS_DIR, name);
      const contents = readFileSync(path, 'utf8');
      const fileChecksum = checksum(contents);
      const appliedChecksum = appliedByName.get(name);

      if (!appliedChecksum) {
        console.error(
          `\n❌ Pending migration: ${name}\n` +
            `   Run: pnpm --filter @phalanxduel/server db:migrate\n`,
        );
        process.exit(1);
      }

      if (appliedChecksum !== fileChecksum) {
        console.error(
          `\n❌ Migration drift detected for ${name}.\n` +
            `   DB checksum: ${appliedChecksum}\n` +
            `   Local checksum: ${fileChecksum}\n` +
            `   Run: pnpm --filter @phalanxduel/server db:migrate\n`,
        );
        process.exit(1);
      }
    }
  } finally {
    await sql.end();
  }
}
