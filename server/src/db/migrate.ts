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

export async function runMigrations(client: postgres.Sql): Promise<void> {
  const ensureMigrationTable = async (): Promise<void> => {
    await client`
      CREATE TABLE IF NOT EXISTS ${client.unsafe(migrationTable)} (
        name text PRIMARY KEY,
        checksum text NOT NULL,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `;
  };

  await ensureMigrationTable();

  const appliedRows = await client<
    { name: string; checksum: string; applied_at: Date }[]
  >`SELECT name, checksum, applied_at FROM ${client.unsafe(migrationTable)} ORDER BY name`;
  const migrations = loadMigrationFiles();

  // ── Baseline re-synchronization ──────────────────────────────────────────
  // If no migrations are recorded but core tables exist, assume baseline is applied.
  if (appliedRows.length === 0 && migrations.length > 0) {
    const tableCheck = await client<{ count: string }[]>`
      SELECT count(*)::text FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'achievements'
    `;
    if (parseInt(tableCheck[0]?.count ?? '0', 10) > 0) {
      const baseline = migrations.find((m) => m.name === '0000_baseline.sql');
      if (baseline) {
        console.log(
          `📡 Existing tables detected but no migration records. Re-syncing baseline: ${baseline.name}`,
        );
        await client`INSERT INTO ${client.unsafe(migrationTable)} (name, checksum) VALUES (${baseline.name}, ${baseline.checksum})`;
        appliedRows.push({
          name: baseline.name,
          checksum: baseline.checksum,
          applied_at: new Date(),
        });
      }
    }
  }

  const migrationNames = new Set(migrations.map((m) => m.name));

  console.log(
    `📋 Migration inventory: ${migrations.length} file(s) on disk, ${appliedRows.length} recorded in DB`,
  );

  // ── Squash detection ──────────────────────────────────────────────────
  const legacyRecords = appliedRows.filter((row) => !migrationNames.has(row.name));
  if (legacyRecords.length > 0 && migrations.length > 0) {
    const baseline = migrations[0]!;
    console.log(
      `🔄 Squash detected: ${legacyRecords.length} legacy migration(s) will be replaced by ${baseline.name}`,
    );
    await client.begin(async (tx) => {
      await tx.unsafe(`DELETE FROM ${migrationTable}`);
      await tx.unsafe(`INSERT INTO ${migrationTable} (name, checksum) VALUES ($1, $2)`, [
        baseline.name,
        baseline.checksum,
      ]);
    });
    console.log(`✅ Squash complete: ${baseline.name} is now the sole recorded migration`);
  }

  // Re-read applied state after potential squash
  const postSquashRows = await client<
    { name: string; checksum: string }[]
  >`SELECT name, checksum FROM ${client.unsafe(migrationTable)} ORDER BY name`;
  const postSquashByName = new Map(postSquashRows.map((row) => [row.name, row]));

  for (const migration of migrations) {
    const applied = postSquashByName.get(migration.name);
    if (applied) {
      if (applied.checksum !== migration.checksum) {
        if (applied.checksum === 'corrupted') {
          console.warn(
            `⚠️  Checksum for ${migration.name} is marked as 'corrupted'. Re-syncing record...`,
          );
          await client`
            UPDATE ${client.unsafe(migrationTable)} 
            SET checksum = ${migration.checksum} 
            WHERE name = ${migration.name}
          `;
          continue;
        } else {
          throw new Error(
            `Migration checksum drift for ${migration.name}: ` +
              `db=${applied.checksum} local=${migration.checksum}`,
          );
        }
      } else {
        console.log(`↩️  Skipping already-applied migration ${migration.name}`);
        continue;
      }
    }

    console.log(`➡️  Applying ${migration.name}...`);
    await client.begin(async (tx) => {
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

  const finalRows = await client<
    { count: string }[]
  >`SELECT COUNT(*)::text AS count FROM ${client.unsafe(migrationTable)}`;
  const appliedCount = parseInt(finalRows[0]?.count ?? '0', 10);
  if (appliedCount !== migrations.length) {
    throw new Error(
      `Migration count mismatch after run: ${appliedCount} recorded in DB vs ${migrations.length} on disk.`,
    );
  }
}

async function main() {
  console.log('🚀 Executing database migrations...');

  try {
    await runMigrations(sql);
    console.log('✅ Migrations complete!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    throw err;
  } finally {
    await sql.end();
  }
}

if (process.env.NODE_ENV !== 'test') {
  main().catch((err: unknown) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
}
