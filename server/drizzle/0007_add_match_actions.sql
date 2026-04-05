-- TASK-96: Durable Ledger — append-only action log for distributed replay and audit.
-- Sits alongside the existing transaction_logs table during the migration window.
-- Once MatchManager is fully migrated (TASK-97+), transaction_logs can be retired.
CREATE TABLE "match_actions" (
	"match_id" uuid NOT NULL,
	"sequence_number" integer NOT NULL,
	"action" jsonb NOT NULL,
	"state_hash_before" text NOT NULL,
	"state_hash_after" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "match_actions_pkey" PRIMARY KEY("match_id","sequence_number")
);
--> statement-breakpoint
ALTER TABLE "match_actions" ADD CONSTRAINT "match_actions_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE no action ON UPDATE no action;
