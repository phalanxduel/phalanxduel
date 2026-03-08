ALTER TABLE "users" RENAME COLUMN "name" TO "gamertag";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "gamertag_normalized" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "suffix" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "gamertag_changed_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "favorite_suit" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "tagline" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "avatar_icon" text;--> statement-breakpoint
UPDATE "users" SET "gamertag_normalized" = lower("gamertag") WHERE "gamertag_normalized" IS NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "gamertag_normalized" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "gamertag_unique_idx" ON "users" USING btree ("gamertag_normalized","suffix");
