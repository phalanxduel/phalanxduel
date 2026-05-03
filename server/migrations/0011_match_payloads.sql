CREATE TABLE IF NOT EXISTS "match_payloads" (
	"match_id" uuid PRIMARY KEY NOT NULL,
	"state" jsonb,
	"action_history" jsonb,
	"transaction_log" jsonb,
	"event_log" jsonb,
	"archived_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "match_payloads" ADD CONSTRAINT "match_payloads_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE no action ON UPDATE no action;
