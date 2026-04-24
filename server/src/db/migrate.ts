import postgres from 'postgres';
import '../loadEnv.js';
import { loadMigrationFiles } from './migrations.js';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const sql = postgres(connectionString, { max: 1 });
const migrationTable = 'public.schema_migrations';

async function ensureMigrationTable(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS ${sql.unsafe(migrationTable)} (
      name text PRIMARY KEY,
      checksum text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `;
}

async function main() {
  console.log('🚀 Executing database migrations...');

  try {
    await ensureMigrationTable();

    const appliedRows = await sql<
      { name: string; checksum: string; applied_at: Date }[]
    >`SELECT name, checksum, applied_at FROM ${sql.unsafe(migrationTable)} ORDER BY name`;
    const appliedByName = new Map(appliedRows.map((row) => [row.name, row]));
    const migrations = loadMigrationFiles();

    for (const migration of migrations) {
      const applied = appliedByName.get(migration.name);
      if (applied) {
        if (applied.checksum !== migration.checksum) {
          throw new Error(
            `Migration checksum drift for ${migration.name}: ` +
              `db=${applied.checksum} local=${migration.checksum}`,
          );
        }
        console.log(`↩️  Skipping already-applied migration ${migration.name}`);
        continue;
      }

      console.log(`➡️  Applying ${migration.name}...`);
      await sql.begin(async (tx) => {
        for (const statement of migration.statements) {
          await tx.unsafe(statement);
        }
        await tx.unsafe(`INSERT INTO ${migrationTable} (name, checksum) VALUES ($1, $2)`, [
          migration.name,
          migration.checksum,
        ]);
      });
      console.log(`✅ Applied ${migration.name}`);
    }

    console.log('✅ Migrations complete!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    throw err;
  } finally {
    await sql.end();
  }
}

main().catch((err: unknown) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
