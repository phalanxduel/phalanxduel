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
  identityAuditLog,
  achievements,
} from './schema.js';
import { eq, and, gt, isNull, or } from 'drizzle-orm';
import crypto from 'crypto';
import { traceDbQuery, traceDbTransaction } from './observability.js';

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

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
    return rows[0] ?? null;
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

  async recordLoginFailure(userId: string, ipAddress?: string): Promise<boolean> {
    const database = db;
    if (!database) return false;

    const [user] = await database
      .select({
        loginFailedAttempts: users.loginFailedAttempts,
        loginLockedUntil: users.loginLockedUntil,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) return false;

    const newCount = user.loginFailedAttempts + 1;
    const shouldLock = newCount >= MAX_LOGIN_ATTEMPTS;
    const lockedUntil = shouldLock ? new Date(Date.now() + LOCKOUT_DURATION_MS) : null;

    await database
      .update(users)
      .set({
        loginFailedAttempts: newCount,
        loginLockedUntil: lockedUntil ?? user.loginLockedUntil,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    if (shouldLock) {
      await this.appendAuditLog(userId, 'account_locked', { attempts: newCount }, ipAddress);
    }

    return shouldLock;
  }

  async clearLoginFailures(userId: string) {
    const database = db;
    if (!database) return;

    await database
      .update(users)
      .set({ loginFailedAttempts: 0, loginLockedUntil: null, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async rotateSecurityStamp(userId: string): Promise<string> {
    const database = db;
    const stamp = crypto.randomBytes(16).toString('hex');
    if (database) {
      await database
        .update(users)
        .set({ securityStamp: stamp, updatedAt: new Date() })
        .where(eq(users.id, userId));
    }
    return stamp;
  }

  async appendAuditLog(
    userId: string,
    action: 'email_changed' | 'password_changed' | 'gamertag_changed' | 'account_locked',
    metadata: Record<string, unknown> = {},
    ipAddress?: string,
  ) {
    const database = db;
    if (!database) return;

    await traceDbQuery(
      'db.identity_audit_log.insert',
      { operation: 'INSERT', table: 'identity_audit_log' },
      () =>
        database.insert(identityAuditLog).values({
          userId,
          action,
          metadata,
          ipAddress,
        }),
    );
  }

  async exportUserData(userId: string) {
    const database = db;
    if (!database) return null;

    const [user] = await database
      .select({
        id: users.id,
        gamertag: users.gamertag,
        suffix: users.suffix,
        email: users.email,
        elo: users.elo,
        favoriteSuit: users.favoriteSuit,
        tagline: users.tagline,
        avatarIcon: users.avatarIcon,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        emailNotifications: users.emailNotifications,
        reminderNotifications: users.reminderNotifications,
        emailVerifiedAt: users.emailVerifiedAt,
        marketingConsentAt: users.marketingConsentAt,
        legalConsentVersion: users.legalConsentVersion,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) return null;

    const matchHistory = await database
      .select({
        id: matches.id,
        status: matches.status,
        config: matches.config,
        outcome: matches.outcome,
        createdAt: matches.createdAt,
        updatedAt: matches.updatedAt,
        player1Name: matches.player1Name,
        player2Name: matches.player2Name,
      })
      .from(matches)
      .where(or(eq(matches.player1Id, userId), eq(matches.player2Id, userId)));

    const userAchievements = await database
      .select()
      .from(achievements)
      .where(eq(achievements.userId, userId));

    const ratings = await database
      .select()
      .from(playerRatings)
      .where(eq(playerRatings.userId, userId));

    const auditLog = await database
      .select()
      .from(identityAuditLog)
      .where(eq(identityAuditLog.userId, userId));

    return {
      profile: user,
      matchHistory,
      achievements: userAchievements,
      ratings,
      identityAuditLog: auditLog,
      exportedAt: new Date().toISOString(),
    };
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
        await tx.delete(matchResults).where(eq(matchResults.userId, userId));
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
