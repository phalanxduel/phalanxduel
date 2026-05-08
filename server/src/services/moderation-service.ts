import * as postmark from 'postmark';
import { db } from '../db/index.js';
import { users, matchComments, adminAuditLog } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { ContentFilterService } from '../content-filter.js';

const SUPPORT_EMAIL = 'support@phalanxduel.com';
const FROM_EMAIL = process.env.SYSTEM_EMAIL || 'no-reply@phalanxduel.com';

/**
 * ModerationService handles the business logic for content oversight,
 * including user suspensions, content removal, and administrative notifications.
 */
export class ModerationService {
  private client: postmark.ServerClient | null = null;

  constructor() {
    const apiKey = process.env.POSTMARK_API_KEY;
    if (apiKey) {
      this.client = new postmark.ServerClient(apiKey);
    }
  }

  /**
   * Disables a user account and sends a notification to support.
   */
  async disableUser(userId: string, reason: string, actorId: string): Promise<boolean> {
    const database = db;
    if (!database) return false;

    try {
      const [user] = await database.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!user) return false;

      await database
        .update(users)
        .set({
          isDisabled: true,
          disabledReason: reason,
          disabledAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      await database.insert(adminAuditLog).values({
        actorId,
        action: 'terminate_match', // Reusing existing enum for now or adding new if allowed
        targetId: userId,
        metadata: { reason, action: 'disable_user' },
      });

      await this.notifySupport('User Account Disabled', {
        userId,
        gamertag: user.gamertag,
        email: user.email,
        reason,
        actionBy: actorId,
      });

      return true;
    } catch (err) {
      console.error('Failed to disable user:', err);
      return false;
    }
  }

  /**
   * Removes a comment and notifies the user (via system notification if applicable).
   */
  async removeComment(commentId: string, reason: string, actorId: string): Promise<boolean> {
    const database = db;
    if (!database) return false;

    try {
      const [comment] = await database
        .select()
        .from(matchComments)
        .where(eq(matchComments.id, commentId))
        .limit(1);
      if (!comment) return false;

      await database
        .update(matchComments)
        .set({
          isRemoved: true,
          removalReason: reason,
          removedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(matchComments.id, commentId));

      await database.insert(adminAuditLog).values({
        actorId,
        action: 'terminate_match',
        targetId: commentId,
        metadata: { reason, action: 'remove_comment', matchId: comment.matchId },
      });

      await this.notifySupport('Comment Removed', {
        commentId,
        matchId: comment.matchId,
        content: comment.content,
        reason,
        actionBy: actorId,
      });

      return true;
    } catch (err) {
      console.error('Failed to remove comment:', err);
      return false;
    }
  }

  /**
   * Purges user data (anonymization) for GDPR compliance while preserving match history.
   */
  async purgeUserData(userId: string, actorId: string): Promise<boolean> {
    const database = db;
    if (!database) return false;

    try {
      const [user] = await database.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!user) return false;

      // Anonymize the account
      await database
        .update(users)
        .set({
          email: `purged-${userId}@deleted.phalanxduel.com`,
          gamertag: 'DELETED_USER',
          gamertagNormalized: 'deleted_user',
          passwordHash: 'PURGED',
          isDisabled: true,
          disabledReason: 'Account Purged (User Request or Moderation)',
          disabledAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      await database.insert(adminAuditLog).values({
        actorId,
        action: 'terminate_match',
        targetId: userId,
        metadata: { action: 'purge_user' },
      });

      await this.notifySupport('User Data Purged', {
        userId,
        originalGamertag: user.gamertag,
        actionBy: actorId,
      });

      return true;
    } catch (err) {
      console.error('Failed to purge user data:', err);
      return false;
    }
  }

  /**
   * Automatically handles flagged content by notifying support.
   */
  async handleViolation(
    userId: string,
    content: string,
    type: 'gamertag' | 'comment',
  ): Promise<void> {
    const filter = ContentFilterService.getInstance();
    const violations = filter.getViolations(content);

    if (violations.length > 0) {
      await this.notifySupport(`Flagged ${type} Content Detected`, {
        userId,
        contentType: type,
        content,
        violations,
        recommendation: 'Manual Review Required',
      });
    }
  }

  private async notifySupport(subject: string, metadata: Record<string, unknown>): Promise<void> {
    if (!this.client) {
      console.log(`[STUB-MAIL] Subject: ${subject}`, metadata);
      return;
    }

    try {
      await this.client.sendEmail({
        From: FROM_EMAIL,
        To: SUPPORT_EMAIL,
        Subject: `[MODERATION] ${subject}`,
        TextBody: `Moderation event occurred.\n\nDetails:\n${JSON.stringify(metadata, null, 2)}\n\nPlease log in to the Admin Dashboard to take action.`,
      });
    } catch (err) {
      console.error('Failed to send moderation email:', err);
    }
  }
}
