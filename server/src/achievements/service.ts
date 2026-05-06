import { db } from '../db/index.js';
import { achievements, users } from '../db/schema.js';
import { eq, count } from 'drizzle-orm';
import { traceDbQuery } from '../db/observability.js';
import { ACHIEVEMENT_METADATA, type AchievementType } from '@phalanxduel/shared';

export interface AchievementStats {
  totalEarned: number;
  rarity: number; // percentage
}

export class AchievementService {
  /**
   * Returns rarity stats for all achievement types.
   * Rarity = (users with achievement) / (total users) * 100
   */
  async getGlobalRarityStats(): Promise<Record<string, number>> {
    if (!db) return {};

    const stats = await traceDbQuery(
      'db.achievements.rarity_stats',
      { operation: 'SELECT', table: 'achievements' },
      async () => {
        const [totalUsersResult] = await db!.select({ count: count() }).from(users);
        const totalUsers = totalUsersResult?.count ?? 1;

        const countsByType = await db!
          .select({
            type: achievements.type,
            count: count(),
          })
          .from(achievements)
          .groupBy(achievements.type);

        const rarityMap: Record<string, number> = {};
        for (const row of countsByType) {
          rarityMap[row.type] = Math.round(((row.count ?? 0) / Math.max(1, totalUsers)) * 10000) / 100;
        }
        return rarityMap;
      }
    );

    return stats;
  }

  async getUserAchievements(userId: string) {
    if (!db) return [];

    return await traceDbQuery(
      'db.achievements.get_for_user',
      { operation: 'SELECT', table: 'achievements' },
      () => db!.select().from(achievements).where(eq(achievements.userId, userId))
    );
  }

  async getAchievementDetails(type: AchievementType) {
    const metadata = ACHIEVEMENT_METADATA[type];
    if (!metadata) return null;

    const rarityStats = await this.getGlobalRarityStats();
    return {
      ...metadata,
      rarity: rarityStats[type] ?? 0,
    };
  }
}

export const achievementService = new AchievementService();
