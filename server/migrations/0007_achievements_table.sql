CREATE TABLE IF NOT EXISTS "achievements" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "type" text NOT NULL,
  "awarded_at" timestamp DEFAULT now() NOT NULL,
  "match_id" text,
  "metadata" jsonb DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "achievements_user_id_awarded_at_idx"
  ON "achievements" USING btree ("user_id", "awarded_at" DESC);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "achievements_user_type_unique_idx"
  ON "achievements" USING btree ("user_id", "type");
