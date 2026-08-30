import type { CardSkinId, MatchCosmetics } from '@phalanxduel/shared';
import { CardSkinIdSchema } from '@phalanxduel/shared';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from './db/index.js';
import { cosmeticProducts, userEntitlements, users } from './db/schema.js';
import type { MatchInstance } from './match-types.js';

export const DEFAULT_CARD_SKIN_ID: CardSkinId = 'default';
export const DUAL_LOOP_CARD_SKIN_ID: CardSkinId = 'dual-loop';
export const DUAL_LOOP_PRODUCT_ID = '51d7b9ca-4cb5-4f29-a7df-13c8b4e0b71f';
export const DUAL_LOOP_PRODUCT_SKU = 'com.phalanxduel.skin_dual_loop';

export function normalizeCardSkinId(value: unknown): CardSkinId {
  const parsed = CardSkinIdSchema.safeParse(value);
  return parsed.success ? parsed.data : DEFAULT_CARD_SKIN_ID;
}

export async function getEquippedCardSkin(userId?: string): Promise<CardSkinId> {
  if (!userId || !db) return DEFAULT_CARD_SKIN_ID;

  try {
    const [user] = await db
      .select({ cardSkinId: users.equippedCardSkin })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return normalizeCardSkinId(user?.cardSkinId);
  } catch {
    return DEFAULT_CARD_SKIN_ID;
  }
}

export function getMatchCosmetics(match: MatchInstance): MatchCosmetics {
  return [
    { cardSkinId: normalizeCardSkinId(match.players[0]?.cardSkinId) },
    { cardSkinId: normalizeCardSkinId(match.players[1]?.cardSkinId) },
  ];
}

export async function userOwnsCardSkin(userId: string, cardSkinId: CardSkinId): Promise<boolean> {
  if (cardSkinId === DEFAULT_CARD_SKIN_ID) return true;
  if (!db) return false;

  const [owned] = await db
    .select({ entitlementId: userEntitlements.id })
    .from(userEntitlements)
    .innerJoin(cosmeticProducts, eq(userEntitlements.productId, cosmeticProducts.id))
    .where(
      and(eq(userEntitlements.userId, userId), eq(cosmeticProducts.sku, DUAL_LOOP_PRODUCT_SKU)),
    )
    .limit(1);

  return Boolean(owned);
}

export async function equipCardSkin(userId: string, cardSkinId: CardSkinId): Promise<boolean> {
  if (!db) throw new Error('Database not available');
  const updated = await db
    .update(users)
    .set({ equippedCardSkin: cardSkinId })
    .where(eq(users.id, userId))
    .returning({ id: users.id });
  return updated.length > 0;
}

export async function awardDualLoopForCompletedMatch(
  userIds: [string | null, string | null],
): Promise<void> {
  if (!db) return;

  const [product] = await db
    .select({ id: cosmeticProducts.id })
    .from(cosmeticProducts)
    .where(eq(cosmeticProducts.sku, DUAL_LOOP_PRODUCT_SKU))
    .limit(1);
  if (!product) return;

  const candidateUserIds = [...new Set(userIds.filter((id): id is string => id !== null))];
  if (candidateUserIds.length === 0) return;

  // Guest/bot matches and test fixtures can carry IDs that are not persisted users.
  // Do not let an optional cosmetic award make an otherwise valid match unrecoverable.
  const persistedUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(inArray(users.id, candidateUserIds));

  for (const { id: userId } of persistedUsers) {
    await db
      .insert(userEntitlements)
      .values({
        userId,
        productId: product.id,
        transactionId: `unlock:first-match:${userId}:dual-loop`,
        platform: 'achievement',
      })
      .onConflictDoNothing();
  }
}
