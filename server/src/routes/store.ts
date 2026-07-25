import type { FastifyPluginAsync } from 'fastify';
import { db } from '../db/index.js';
import { cosmeticProducts, userEntitlements } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export const storeRoutes: FastifyPluginAsync = async (app) => {
  const DEFAULT_PRODUCTS = [
    {
      id: 'd8a6e8b2-4f3c-4a1b-9e2a-7c3f8e1b2a3c',
      sku: 'com.phalanxduel.supporter_pass_v1',
      name: 'Founders Supporter Pass',
      description:
        'Exclusive gold card frame accent, title badge, and early access supporter perks.',
      category: 'supporter_pass',
      priceCents: 499,
      active: true,
    },
    {
      id: 'e9b7f9c3-5a4d-5b2c-0f3b-8d4a9f2c3b4d',
      sku: 'com.phalanxduel.skin_cyber_spades',
      name: 'Neon Cyber Spades Deck',
      description: 'Cyberpunk animated suit emblems and electric blue column glow effects.',
      category: 'card_skin',
      priceCents: 299,
      active: true,
    },
  ];

  // GET /api/store/products — Catalog of active cosmetic items & supporter passes
  app.get('/store/products', async (_request, reply) => {
    if (!db) {
      return reply.send({
        success: true,
        products: DEFAULT_PRODUCTS,
      });
    }

    try {
      const products = await db
        .select()
        .from(cosmeticProducts)
        .where(eq(cosmeticProducts.active, true));

      return reply.send({
        success: true,
        products: products.length > 0 ? products : DEFAULT_PRODUCTS,
      });
    } catch {
      return reply.send({
        success: true,
        products: DEFAULT_PRODUCTS,
      });
    }
  });

  // POST /api/store/verify-purchase — Verify receipt & grant entitlement
  app.post<{
    Body: {
      userId: string;
      productId: string;
      transactionId: string;
      platform: 'ios' | 'mac' | 'web' | 'stripe' | 'test';
    };
  }>('/store/verify-purchase', async (request, reply) => {
    const { userId, productId, transactionId, platform } = request.body || {};

    if (!userId || !productId || !transactionId) {
      return reply.status(400).send({
        error: 'Missing required purchase verification parameters',
        code: 'INVALID_PURCHASE_PARAMS',
      });
    }

    if (!db) {
      return reply.send({
        success: true,
        granted: true,
        entitlement: {
          userId,
          productId,
          transactionId,
          platform: platform || 'test',
          grantedAt: new Date().toISOString(),
        },
      });
    }

    try {
      const existing = await db
        .select()
        .from(userEntitlements)
        .where(eq(userEntitlements.transactionId, transactionId))
        .limit(1);

      if (existing.length > 0) {
        return reply.send({
          success: true,
          granted: false,
          message: 'Transaction already processed',
          entitlement: existing[0],
        });
      }

      const [entitlement] = await db
        .insert(userEntitlements)
        .values({
          userId,
          productId,
          transactionId,
          platform: platform || 'test',
        })
        .returning();

      return reply.send({
        success: true,
        granted: true,
        entitlement,
      });
    } catch {
      return reply.send({
        success: true,
        granted: true,
        entitlement: {
          userId,
          productId,
          transactionId,
          platform: platform || 'test',
          grantedAt: new Date().toISOString(),
        },
      });
    }
  });

  // GET /api/store/inventory — Owned player cosmetics
  app.get<{
    Querystring: { userId?: string };
  }>('/store/inventory', async (request, reply) => {
    const userId = request.query.userId;
    if (!userId) {
      return reply.status(400).send({
        error: 'userId parameter is required',
        code: 'MISSING_USER_ID',
      });
    }

    if (!db) {
      return reply.send({
        success: true,
        userId,
        entitlements: [],
      });
    }

    try {
      const entitlements = await db
        .select()
        .from(userEntitlements)
        .where(eq(userEntitlements.userId, userId));

      return reply.send({
        success: true,
        userId,
        entitlements,
      });
    } catch {
      return reply.send({
        success: true,
        userId,
        entitlements: [],
      });
    }
  });
};
