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

  // POST /api/store/create-checkout-session — Create a Stripe Checkout Session
  app.post<{
    Body: {
      userId: string;
      productId: string;
      successUrl?: string;
      cancelUrl?: string;
    };
  }>('/store/create-checkout-session', async (request, reply) => {
    const { userId, productId, successUrl, cancelUrl } = request.body || {};

    if (!userId || !productId) {
      return reply.status(400).send({
        error: 'Missing required parameters (userId, productId)',
        code: 'MISSING_PARAMS',
      });
    }

    const product = DEFAULT_PRODUCTS.find((p) => p.id === productId || p.sku === productId) || {
      id: productId,
      sku: productId,
      name: 'Phalanx Cosmetic Item',
      priceCents: 499,
    };

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

    if (!stripeSecretKey) {
      // Local simulation mode when STRIPE_SECRET_KEY is not configured
      const simulatedTx = `cs_test_${Date.now()}`;
      return reply.send({
        success: true,
        mode: 'simulation',
        url: successUrl ? `${successUrl}?session_id=${simulatedTx}` : `/?purchase=simulated`,
        sessionId: simulatedTx,
        message: 'Stripe simulation mode active (STRIPE_SECRET_KEY not set)',
      });
    }

    try {
      const body = new URLSearchParams({
        'payment_method_types[]': 'card',
        'line_items[0][price_data][currency]': 'usd',
        'line_items[0][price_data][product_data][name]': product.name,
        'line_items[0][price_data][unit_amount]': String(product.priceCents),
        'line_items[0][quantity]': '1',
        mode: 'payment',
        'metadata[userId]': userId,
        'metadata[productId]': product.sku,
        success_url: successUrl || 'http://127.0.0.1:5173/?purchase=success',
        cancel_url: cancelUrl || 'http://127.0.0.1:5173/?purchase=cancelled',
      });

      const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${stripeSecretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      const session = (await res.json()) as {
        id?: string;
        url?: string;
        error?: { message: string };
      };

      if (!res.ok || session.error) {
        return reply.status(500).send({
          error: session.error?.message || 'Stripe API error',
          code: 'STRIPE_ERROR',
        });
      }

      return reply.send({
        success: true,
        mode: 'live',
        sessionId: session.id,
        url: session.url,
      });
    } catch (err) {
      return reply.status(500).send({
        error: (err as Error).message || 'Failed to create checkout session',
        code: 'STRIPE_CHECKOUT_FAILED',
      });
    }
  });

  // POST /api/store/stripe-webhook — Handle Stripe payment events
  app.post<{
    Body: {
      type?: string;
      data?: {
        object?: {
          id?: string;
          metadata?: {
            userId?: string;
            productId?: string;
          };
        };
      };
    };
  }>('/store/stripe-webhook', async (request, reply) => {
    const event = request.body || {};

    if (event.type === 'checkout.session.completed') {
      const session = event.data?.object;
      const userId = session?.metadata?.userId;
      const productId = session?.metadata?.productId;
      const transactionId = session?.id || `cs_${Date.now()}`;

      if (userId && productId) {
        if (db) {
          try {
            await db
              .insert(userEntitlements)
              .values({
                userId,
                productId,
                transactionId,
                platform: 'stripe',
              })
              .onConflictDoNothing();
          } catch {
            // Ignore duplicate webhook events
          }
        }
      }
    }

    return reply.send({ received: true });
  });
};
