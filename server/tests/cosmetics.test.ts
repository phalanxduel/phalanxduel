import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { and, eq } from 'drizzle-orm';
import { db } from '../src/db/index.js';
import { cosmeticProducts, userEntitlements, users } from '../src/db/schema.js';
import { InMemoryLedgerStore } from '../src/db/ledger-store.js';
import type { MatchRepository } from '../src/db/match-repo.js';
import { LocalMatchManager } from '../src/match.js';
import type { MatchInstance } from '../src/match-types.js';
import { projectForViewer } from '../src/utils/viewer-projection.js';
import {
  awardDualLoopForCompletedMatch,
  DUAL_LOOP_PRODUCT_SKU,
  equipCardSkin,
  getEquippedCardSkin,
  userOwnsCardSkin,
} from '../src/cosmetics.js';

const createdUserIds: string[] = [];

afterEach(async () => {
  if (!db) return;
  for (const userId of createdUserIds.splice(0)) {
    await db.delete(userEntitlements).where(eq(userEntitlements.userId, userId));
    await db.delete(users).where(eq(users.id, userId));
  }
});

async function createUser() {
  if (!db) throw new Error('Test database unavailable');
  const id = randomUUID();
  const discriminator = id.slice(0, 8);
  await db.insert(users).values({
    id,
    gamertag: `Cosmetic${discriminator}`,
    gamertagNormalized: `cosmetic${discriminator}`,
    email: `cosmetic-${id}@example.test`,
    passwordHash: 'not-a-real-password-hash',
  });
  createdUserIds.push(id);
  return id;
}

describe('earned card cosmetics', () => {
  it('awards Dual Loop once after match completion and permits equipping it', async () => {
    if (!db) return;
    const userId = await createUser();

    await awardDualLoopForCompletedMatch([userId, null]);
    await awardDualLoopForCompletedMatch([userId, null]);

    const entitlements = await db
      .select({
        sku: cosmeticProducts.sku,
        platform: userEntitlements.platform,
      })
      .from(userEntitlements)
      .innerJoin(cosmeticProducts, eq(userEntitlements.productId, cosmeticProducts.id))
      .where(
        and(eq(userEntitlements.userId, userId), eq(cosmeticProducts.sku, DUAL_LOOP_PRODUCT_SKU)),
      );

    expect(entitlements).toEqual([
      {
        sku: DUAL_LOOP_PRODUCT_SKU,
        platform: 'achievement',
      },
    ]);
    expect(await userOwnsCardSkin(userId, 'dual-loop')).toBe(true);

    await equipCardSkin(userId, 'dual-loop');
    expect(await getEquippedCardSkin(userId)).toBe('dual-loop');
  });

  it('does not treat Dual Loop as owned before the first completed match', async () => {
    if (!db) return;
    const userId = await createUser();
    expect(await userOwnsCardSkin(userId, 'dual-loop')).toBe(false);
  });

  it('loads the equipped skin into a new match and projects it to the opponent', async () => {
    if (!db) return;
    const userId = await createUser();
    await awardDualLoopForCompletedMatch([userId, null]);
    await equipCardSkin(userId, 'dual-loop');

    const storedMatches = new Map<string, MatchInstance>();
    const matchRepo = {
      listActiveMatchesForUser: vi.fn(async () => []),
      saveMatch: vi.fn(async (match: MatchInstance) => {
        storedMatches.set(match.matchId, match);
      }),
      getMatch: vi.fn(async (matchId: string) => storedMatches.get(matchId) ?? null),
      verifyUserIds: vi.fn(async (player1Id: string | null, player2Id: string | null) => [
        player1Id,
        player2Id,
      ]),
      saveEventLog: vi.fn(),
      saveFinalStateHash: vi.fn(),
    } as unknown as MatchRepository;
    const manager = new LocalMatchManager(matchRepo, new InMemoryLedgerStore());

    const { matchId } = await manager.createMatch('Loop Owner', null, { userId });
    await manager.joinMatch(matchId, 'Opponent', null);
    const match = await manager.getMatch(matchId);

    expect(match?.players[0]?.cardSkinId).toBe('dual-loop');
    expect(projectForViewer(match!, 1).cosmetics).toEqual([
      { cardSkinId: 'dual-loop' },
      { cardSkinId: 'default' },
    ]);
    expect(projectForViewer(match!, 1).postState.players[0]!.hand).toHaveLength(0);
    expect(projectForViewer(match!, 1).postState.players[0]!.handCount).toBeGreaterThan(0);
  });
});
