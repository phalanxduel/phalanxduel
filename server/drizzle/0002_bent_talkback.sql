CREATE TABLE IF NOT EXISTS "elo_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"category" text NOT NULL,
	"elo" integer NOT NULL,
	"k_factor" integer NOT NULL,
	"window_days" integer NOT NULL,
	"matches_in_window" integer NOT NULL,
	"wins_in_window" integer NOT NULL,
	"computed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "bot_strategy" text;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'elo_snapshots_user_id_users_id_fk') THEN
    ALTER TABLE "elo_snapshots" ADD CONSTRAINT "elo_snapshots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "elo_snapshots_user_category_idx" ON "elo_snapshots" USING btree ("user_id","category","computed_at");