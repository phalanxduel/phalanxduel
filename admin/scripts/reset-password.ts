/**
 * Reset an admin user's password and ensure is_admin = true.
 *
 * Usage:
 *   pnpm admin:reset-password <email> <newPassword>
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import postgres from 'postgres';
import bcrypt from 'bcryptjs';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../..');

// Load env files (same logic as server/src/loadEnv.ts)
for (const file of ['.env', '.env.local']) {
  const path = resolve(repoRoot, file);
  if (!existsSync(path)) continue;
  const parsed = parseEnv(readFileSync(path, 'utf8'));
  for (const [key, value] of Object.entries(parsed)) {
    process.env[key] ??= value;
  }
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL not set — check .env.local');
  process.exit(1);
}

const [, , email, password] = process.argv;

if (!email || !password) {
  console.error('Usage: pnpm admin:reset-password <email> <newPassword>');
  process.exit(1);
}

if (password.length < 8) {
  console.error('Password must be at least 8 characters');
  process.exit(1);
}

const sql = postgres(connectionString, { connect_timeout: 15, idle_timeout: 5 });

try {
  const hash = await bcrypt.hash(password, 10);
  const result = await sql`
    UPDATE users
    SET password_hash = ${hash}, is_admin = true, updated_at = NOW()
    WHERE email = ${email}
    RETURNING id, gamertag, suffix, email, is_admin
  `;

  if (result.length === 0) {
    console.error(`No user found with email: ${email}`);
    process.exit(1);
  }

  const user = result[0];
  const tag = user.suffix != null ? `${user.gamertag}#${user.suffix}` : user.gamertag;
  console.log(`Password reset and admin enabled for ${tag} (${user.email})`);
} catch (err) {
  console.error('Failed:', (err as Error).message);
  process.exit(1);
} finally {
  await sql.end({ timeout: 2 });
}
