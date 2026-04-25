ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "visibility" text DEFAULT 'private' NOT NULL;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "public_status" text;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "public_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "min_public_rating" integer;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "max_public_rating" integer;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "min_games_played" integer;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "requires_established_rating" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "player_ratings" (
  "user_id" uuid NOT NULL REFERENCES "users"("id"),
  "mode" text NOT NULL,
  "elo_rating" integer NOT NULL DEFAULT 1000,
  "glicko_rating" integer NOT NULL DEFAULT 1500,
  "glicko_rating_deviation" integer NOT NULL DEFAULT 350,
  "glicko_volatility" real NOT NULL DEFAULT 0.06,
  "games_played" integer NOT NULL DEFAULT 0,
  "wins" integer NOT NULL DEFAULT 0,
  "losses" integer NOT NULL DEFAULT 0,
  "draws" integer NOT NULL DEFAULT 0,
  "provisional" boolean NOT NULL DEFAULT true,
  "last_rated_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "player_ratings_pk" PRIMARY KEY ("user_id","mode")
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "match_results" (
  "match_id" uuid NOT NULL REFERENCES "matches"("id"),
  "user_id" uuid NOT NULL REFERENCES "users"("id"),
  "opponent_id" uuid REFERENCES "users"("id"),
  "mode" text NOT NULL,
  "result" text NOT NULL,
  "elo_before" integer NOT NULL,
  "elo_after" integer NOT NULL,
  "elo_delta" integer NOT NULL,
  "glicko_before" integer NOT NULL,
  "glicko_after" integer NOT NULL,
  "glicko_rd_before" integer NOT NULL,
  "glicko_rd_after" integer NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "match_results_pk" PRIMARY KEY ("match_id","user_id")
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "matches_visibility_status_idx" ON "matches" USING btree ("visibility","public_status","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "player_ratings_user_mode_idx" ON "player_ratings" USING btree ("user_id","mode");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "match_results_user_created_idx" ON "match_results" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "match_results_match_idx" ON "match_results" USING btree ("match_id");
