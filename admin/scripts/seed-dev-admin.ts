/**
 * Seed or refresh the default local development administrator account.
 *
 * Defaults:
 *   email:    `mike@phalanxduel.com`
 *   password: adminadmin
 *   gamertag: Mike
 *
 * Override via args:
 *   pnpm admin:seed-dev [email] [password] [gamertag]
 */
import '../src/server/loadEnv.js';
import postgres from 'postgres';
import bcrypt from 'bcryptjs';
import { normalizeGamertag, validateGamertag } from '@phalanxduel/shared';

const DEFAULT_EMAIL = 'mike@phalanxduel.com';
const DEFAULT_PASSWORD = 'adminadmin';
const DEFAULT_GAMERTAG = 'Mike';

const [, , emailArg, passwordArg, gamertagArg] = process.argv;
const email = emailArg ?? process.env.PHALANX_DEV_ADMIN_EMAIL ?? DEFAULT_EMAIL;
const password = passwordArg ?? process.env.PHALANX_DEV_ADMIN_PASSWORD ?? DEFAULT_PASSWORD;
const gamertag = gamertagArg ?? process.env.PHALANX_DEV_ADMIN_GAMERTAG ?? DEFAULT_GAMERTAG;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL not set — check local env or dev DB bootstrap');
  process.exit(1);
}

const emailValidation = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailValidation.test(email)) {
  console.error(`Invalid email: ${email}`);
  process.exit(1);
}

if (password.length < 8) {
  console.error('Password must be at least 8 characters');
  process.exit(1);
}

const gamertagValidation = validateGamertag(gamertag);
if (!gamertagValidation.ok) {
  console.error(gamertagValidation.reason);
  process.exit(1);
}

const normalized = normalizeGamertag(gamertag);
const sql = postgres(connectionString, { connect_timeout: 15, idle_timeout: 5 });

try {
  const hash = await bcrypt.hash(password, 10);
  const existingByEmail = await sql<
    { id: string; gamertag: string; suffix: number | null; email: string; is_admin: boolean }[]
  >`
    SELECT id, gamertag, suffix, email, is_admin
    FROM users
    WHERE email = ${email}
    LIMIT 1
  `;

  if (existingByEmail.length > 0) {
    const updated = await sql<
      { id: string; gamertag: string; suffix: number | null; email: string; is_admin: boolean }[]
    >`
      UPDATE users
      SET password_hash = ${hash}, is_admin = true, updated_at = NOW()
      WHERE email = ${email}
      RETURNING id, gamertag, suffix, email, is_admin
    `;

    const user = updated[0];
    const tag = user?.suffix != null ? `${user.gamertag}#${user.suffix}` : user?.gamertag;
    console.log(`Dev admin refreshed: ${tag} (${user?.email})`);
    process.exit(0);
  }

  const suffixInfo = await sql<{ max_suffix: number | null; count: number }[]>`
    SELECT MAX(suffix)::int AS max_suffix, COUNT(*)::int AS count
    FROM users
    WHERE gamertag_normalized = ${normalized}
  `;

  const existing = suffixInfo[0];
  let suffix: number | null = null;
  if ((existing?.count ?? 0) > 0) {
    if (existing?.max_suffix == null) {
      await sql`
        UPDATE users
        SET suffix = 1, updated_at = NOW()
        WHERE gamertag_normalized = ${normalized} AND suffix IS NULL
      `;
      suffix = 2;
    } else {
      suffix = existing.max_suffix + 1;
    }
  }

  const inserted = await sql<
    { id: string; gamertag: string; suffix: number | null; email: string; is_admin: boolean }[]
  >`
    INSERT INTO users (gamertag, gamertag_normalized, suffix, email, password_hash, is_admin)
    VALUES (${gamertag}, ${normalized}, ${suffix}, ${email}, ${hash}, true)
    RETURNING id, gamertag, suffix, email, is_admin
  `;

  const user = inserted[0];
  const tag = user?.suffix != null ? `${user.gamertag}#${user.suffix}` : user?.gamertag;
  console.log(`Dev admin created: ${tag} (${user?.email})`);
} catch (err) {
  console.error('Failed:', (err as Error).message);
  process.exit(1);
} finally {
  await sql.end({ timeout: 2 });
}
