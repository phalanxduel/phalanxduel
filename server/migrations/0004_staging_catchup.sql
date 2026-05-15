-- 0004_staging_catchup.sql
-- Adds match_comments soft-delete columns missing from staging.
-- These columns are in the baseline schema but were absent from staging due to
-- schema drift (staging was set up before the soft-delete fields were added).
-- Safe to run on any environment — all statements are idempotent.

ALTER TABLE "match_comments" ADD COLUMN IF NOT EXISTS "is_removed" boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE "match_comments" ADD COLUMN IF NOT EXISTS "removed_at" timestamp;
--> statement-breakpoint
ALTER TABLE "match_comments" ADD COLUMN IF NOT EXISTS "removal_reason" text;
