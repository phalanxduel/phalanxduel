import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const MIGRATIONS_DIR = resolve(__dirname, '../../migrations');
export const MIGRATIONS_TABLE = 'schema_migrations';

export interface MigrationFile {
  name: string;
  checksum: string;
  path: string;
  statements: string[];
}

function checksum(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

function splitStatements(sqlText: string): string[] {
  return sqlText
    .split('--> statement-breakpoint')
    .map((statement) => statement.trim())
    .filter(Boolean)
    .map((statement) => statement.replace(/;$/u, '').trim())
    .filter(Boolean);
}

export function loadMigrationFiles(): MigrationFile[] {
  if (!existsSync(MIGRATIONS_DIR)) {
    throw new Error(
      `Migrations directory not found: ${MIGRATIONS_DIR}. ` +
        'This likely means the build did not bundle the migrations folder alongside the compiled output.',
    );
  }

  const names = readdirSync(MIGRATIONS_DIR)
    .filter((entry) => entry.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));

  if (names.length === 0) {
    throw new Error(
      `Migrations directory is empty: ${MIGRATIONS_DIR}. ` +
        'At least one migration file is required.',
    );
  }

  return names.map((name) => {
    const path = resolve(MIGRATIONS_DIR, name);
    const contents = readFileSync(path, 'utf8');
    return {
      name,
      checksum: checksum(contents),
      path,
      statements: splitStatements(contents),
    };
  });
}
