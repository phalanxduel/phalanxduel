import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

async function main() {
  if (!db) {
    console.error('ERROR: Database connection not initialized. Check DATABASE_URL.');
    process.exit(1);
  }

  const email = process.argv[2];
  if (!email) {
    console.error('Usage: tsx scripts/reset-admin-password.ts <email>');
    process.exit(1);
  }

  // Generate a strong random password (16 chars, url-safe base64)
  const plainPassword = crypto.randomBytes(12).toString('base64url');

  // Hash with 12 rounds
  const passwordHash = await bcrypt.hash(plainPassword, 12);

  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user) {
    console.error(`ERROR: User not found with email: ${email}`);
    process.exit(1);
  }

  if (!user.isAdmin) {
    console.warn(
      `WARNING: User ${email} is not marked as isAdmin in the database. Updating anyway.`,
    );
  }

  await db.update(users).set({ passwordHash, isAdmin: true }).where(eq(users.id, user.id));

  console.log(`\n✅ Password successfully reset for: ${email}`);
  console.log(`\nNew Password: ${plainPassword}\n`);

  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
