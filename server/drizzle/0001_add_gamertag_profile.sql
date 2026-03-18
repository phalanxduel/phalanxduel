DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='name') THEN
    ALTER TABLE "users" RENAME COLUMN "name" TO "gamertag";
  END IF;
END $$;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "gamertag_normalized" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "suffix" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "gamertag_changed_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "favorite_suit" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "tagline" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_icon" text;--> statement-breakpoint
UPDATE "users" SET "gamertag_normalized" = lower("gamertag") WHERE "gamertag_normalized" IS NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "gamertag_normalized" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "gamertag_unique_idx" ON "users" USING btree ("gamertag_normalized","suffix");
