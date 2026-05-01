ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "login_failed_attempts" integer DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS "login_locked_until" timestamp,
  ADD COLUMN IF NOT EXISTS "security_stamp" text;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "identity_audit_log" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "action" text NOT NULL,
  "metadata" jsonb DEFAULT '{}' NOT NULL,
  "ip_address" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "identity_audit_log_user_id_idx"
  ON "identity_audit_log" USING btree ("user_id", "created_at" DESC);
