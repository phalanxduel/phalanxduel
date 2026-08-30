-- 0006_dual_loop_cosmetics.sql
-- Adds persistent card-skin loadouts and snapshots them onto matches.

ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "equipped_card_skin" text DEFAULT 'default' NOT NULL;
--> statement-breakpoint
ALTER TABLE "matches"
ADD COLUMN IF NOT EXISTS "player_1_card_skin" text DEFAULT 'default' NOT NULL;
--> statement-breakpoint
ALTER TABLE "matches"
ADD COLUMN IF NOT EXISTS "player_2_card_skin" text DEFAULT 'default' NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cosmetic_products" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "sku" text NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "category" text NOT NULL,
  "price_cents" integer NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "cosmetic_products_sku_unique" UNIQUE ("sku")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_entitlements" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "product_id" uuid NOT NULL REFERENCES "cosmetic_products"("id"),
  "transaction_id" text NOT NULL,
  "platform" text NOT NULL,
  "granted_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "user_entitlements_transaction_id_unique" UNIQUE ("transaction_id")
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "user_entitlements_user_prod_idx"
ON "user_entitlements" USING btree ("user_id", "product_id");
--> statement-breakpoint
INSERT INTO "cosmetic_products" (
  "id",
  "sku",
  "name",
  "description",
  "category",
  "price_cents",
  "active"
)
VALUES (
  '51d7b9ca-4cb5-4f29-a7df-13c8b4e0b71f',
  'com.phalanxduel.skin_dual_loop',
  'Dual Loop',
  'An original microtonal loop card back and face treatment, earned after completing your first match.',
  'card_skin',
  0,
  true
)
ON CONFLICT ("sku") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "category" = EXCLUDED."category",
  "price_cents" = EXCLUDED."price_cents",
  "active" = EXCLUDED."active";
