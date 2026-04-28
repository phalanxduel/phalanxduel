/**
 * Copyright © 2026 Mike Hall
 * Licensed under the GNU Affero General Public License v3.0.
 */

import { db } from './index.js';
import {
  users,
  matches,
  matchResults,
  playerRatings,
  eloSnapshots,
  passwordResetTokens,
} from './schema.js';
import { eq, and, gt, isNull } from 'drizzle-orm';
import { traceDbQuery, traceDbTransaction } from './observability.js';
import crypto from 'crypto';

export interface PreferenceUpdate {
  emailNotifications?: boolean;
  reminderNotifications?: boolean;
  marketingConsentAt?: Date | null;
  legalConsentVersion?: string;
}

export class UserRepository {
  async getUserById(id: string) {
    const database = db;
    if (!database) return null;

    const rows = await traceDbQuery(
      'db.users.get_by_id',
      { operation: 'SELECT', table: 'users' },
      () => database.select().from(users).where(eq(users.id, id)).limit(1),
    );
    return rows[0] || null;
  }

  async updatePreferences(id: string, prefs: PreferenceUpdate) {
    const database = db;
    if (!database) return;

    await traceDbQuery('db.users.update_preferences', { operation: 'UPDATE', table: 'users' }, () =>
      database
        .update(users)
        .set({
          ...prefs,
          updatedAt: new Date(),
        })
        .where(eq(users.id, id)),
    );
  }

  async verifyEmail(id: string) {
    const database = db;
    if (!database) return;

    await traceDbQuery('db.users.verify_email', { operation: 'UPDATE', table: 'users' }, () =>
      database
        .update(users)
        .set({
          emailVerifiedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(users.id, id)),
    );
  }

  /**
   * "The Purge" - Implements the Right to be Forgotten while preserving game integrity.
   */
  async purgeUser(userId: string) {
    const database = db;
    if (!database) return;

    await traceDbTransaction('db.users.purge_transaction', () =>
      database.transaction(async (tx) => {
        // 1. Anonymize matches (keep names, null IDs)
        await tx.update(matches).set({ player1Id: null }).where(eq(matches.player1Id, userId));

        await tx.update(matches).set({ player2Id: null }).where(eq(matches.player2Id, userId));

        // 2. Cleanup match results
        // Delete the purged user's result rows
        await tx.delete(matchResults).where(eq(matchResults.userId, userId));

        // Anonymize the opponent's view of this user
        await tx
          .update(matchResults)
          .set({ opponentId: null })
          .where(eq(matchResults.opponentId, userId));

        // 3. Cleanup ratings & snapshots
        await tx.delete(playerRatings).where(eq(playerRatings.userId, userId));

        await tx.delete(eloSnapshots).where(eq(eloSnapshots.userId, userId));

        // 4. Cleanup auth tokens
        await tx.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));

        // 5. Final Purge: Delete the user identity
        await tx.delete(users).where(eq(users.id, userId));
      }),
    );
  }

  async createPasswordResetToken(userId: string) {
    const database = db;
    if (!database) return null;

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour

    await traceDbQuery(
      'db.users.create_reset_token',
      { operation: 'INSERT', table: 'password_reset_tokens' },
      () =>
        database.insert(passwordResetTokens).values({
          userId,
          tokenHash,
          expiresAt,
        }),
    );

    return token;
  }

  async consumePasswordResetToken(token: string) {
    const database = db;
    if (!database) return null;

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    return await traceDbTransaction('db.users.consume_reset_token', () =>
      database.transaction(async (tx) => {
        const [record] = await tx
          .select()
          .from(passwordResetTokens)
          .where(
            and(
              eq(passwordResetTokens.tokenHash, tokenHash),
              gt(passwordResetTokens.expiresAt, new Date()),
              isNull(passwordResetTokens.usedAt),
            ),
          )
          .limit(1);

        if (!record) return null;

        await tx
          .update(passwordResetTokens)
          .set({ usedAt: new Date() })
          .where(eq(passwordResetTokens.id, record.id));

        return record.userId;
      }),
    );
  }
}
