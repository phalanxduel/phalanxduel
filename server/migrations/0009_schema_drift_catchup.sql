-- Capture FK constraints defined in schema.ts but missing from prior migration files,
-- and indexes present in staging/production but never recorded in migrations.
-- Uses IF NOT EXISTS / DO-block guards so this is safe to apply to staging/production
-- where the objects already exist.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'match_results_match_id_fkey'
  ) THEN
    ALTER TABLE "match_results"
      ADD CONSTRAINT "match_results_match_id_fkey"
        FOREIGN KEY ("match_id") REFERENCES "matches"("id");
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'match_results_user_id_fkey'
  ) THEN
    ALTER TABLE "match_results"
      ADD CONSTRAINT "match_results_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "users"("id");
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'match_results_opponent_id_fkey'
  ) THEN
    ALTER TABLE "match_results"
      ADD CONSTRAINT "match_results_opponent_id_fkey"
        FOREIGN KEY ("opponent_id") REFERENCES "users"("id");
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'password_reset_tokens_user_id_users_id_fk'
  ) THEN
    ALTER TABLE "password_reset_tokens"
      ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk"
        FOREIGN KEY ("user_id") REFERENCES "users"("id");
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'player_ratings_user_id_fkey'
  ) THEN
    ALTER TABLE "player_ratings"
      ADD CONSTRAINT "player_ratings_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "users"("id");
  END IF;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "match_results_match_idx"
  ON "match_results" USING btree ("match_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "match_results_user_created_idx"
  ON "match_results" USING btree ("user_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "matches_visibility_status_idx"
  ON "matches" USING btree ("visibility", "public_status", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "player_ratings_user_mode_idx"
  ON "player_ratings" USING btree ("user_id", "mode");
