import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import '../loadEnv.js';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

// Resolve drizzle/ relative to the server package root, not CWD.
// In dev: server/src/db/migrate.ts → ../../drizzle
// In prod: server/dist/db/migrate.js → ../../drizzle
const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsFolder = resolve(__dirname, '../../drizzle');

const sql = postgres(connectionString, { max: 1 });
const db = drizzle(sql);

async function main() {
  console.log('🚀 Executing database migrations...');

  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

  try {
    await migrate(db, { migrationsFolder });
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
