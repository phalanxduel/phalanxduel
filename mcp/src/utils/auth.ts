import { db } from '../db.js';
import { users } from '../../../server/src/db/schema.js';
import { eq, sql } from 'drizzle-orm';
import { assignGamertagSuffix, validateGamertagFull } from '../../../server/src/gamertag.js';
import { normalizeGamertag } from '@phalanxduel/shared';

export async function registerUserLogic(gamertag: string, email: string, passwordHash: string) {
  const normalized = normalizeGamertag(gamertag);

  const validationError = validateGamertagFull(gamertag);
  if (validationError) {
    throw new Error(validationError);
  }

  const existingEmail = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existingEmail.length > 0) {
    throw new Error('Email already registered');
  }

  return await db.transaction(async (tx) => {
    const [info] = await tx
      .select({
        maxSuffix: sql<number | null>`MAX(${users.suffix})`,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(users)
      .where(eq(users.gamertagNormalized, normalized));

    const existingInfo =
      info && info.count > 0 ? { maxSuffix: info.maxSuffix, count: info.count } : null;
    const { newSuffix, updateExisting } = assignGamertagSuffix(existingInfo);

    if (updateExisting !== null) {
      await tx
        .update(users)
        .set({ suffix: updateExisting })
        .where(eq(users.gamertagNormalized, normalized));
    }

    const [inserted] = await tx
      .insert(users)
      .values({
        gamertag,
        gamertagNormalized: normalized,
        suffix: newSuffix,
        email,
        passwordHash,
      })
      .returning({
        id: users.id,
        gamertag: users.gamertag,
        suffix: users.suffix,
        email: users.email,
        elo: users.elo,
      });

    if (!inserted) throw new Error('User insert returned no rows');
    return inserted;
  });
}
