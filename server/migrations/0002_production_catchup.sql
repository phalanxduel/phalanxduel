-- 0002_production_catchup.sql
-- This migration ensures production has the tables and columns added during the baseline refactor.
-- It is designed to be idempotent and safe to run on staging as well.

CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "match_embeddings" (
	"match_id" uuid PRIMARY KEY NOT NULL,
	"embedding" vector(1536),
	"summary" text,
	"version" integer DEFAULT 1 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "match_payloads" (
	"match_id" uuid PRIMARY KEY NOT NULL,
	"state" jsonb,
	"action_history" jsonb,
	"transaction_log" jsonb,
	"event_log" jsonb,
	"archived_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_disabled" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "disabled_reason" text;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "disabled_at" timestamp;
--> statement-breakpoint

-- Ensure foreign keys exist for the new tables
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'match_embeddings_match_id_matches_id_fk') THEN
        ALTER TABLE "match_embeddings" ADD CONSTRAINT "match_embeddings_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE no action ON UPDATE no action;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'match_payloads_match_id_matches_id_fk') THEN
        ALTER TABLE "match_payloads" ADD CONSTRAINT "match_payloads_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE no action ON UPDATE no action;
    END IF;
END $$;
