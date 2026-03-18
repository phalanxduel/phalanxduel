ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "event_log" jsonb;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "event_log_fingerprint" text;