ALTER TABLE "player_ratings" ADD COLUMN IF NOT EXISTS "abandons" integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "matches_created" integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "successful_starts" integer NOT NULL DEFAULT 0;
