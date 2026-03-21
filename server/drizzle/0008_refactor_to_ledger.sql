ALTER TABLE "transaction_logs" RENAME TO "match_actions";--> statement-breakpoint
ALTER TABLE "matches" DROP CONSTRAINT "matches_player_1_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "matches" DROP CONSTRAINT "matches_player_2_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "match_actions" DROP CONSTRAINT "transaction_logs_match_id_matches_id_fk";
--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "last_snapshot" jsonb;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "last_snapshot_seq" integer;--> statement-breakpoint
ALTER TABLE "match_actions" ADD CONSTRAINT "match_actions_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "match_id_idx" ON "match_actions" USING btree ("match_id");--> statement-breakpoint
ALTER TABLE "matches" DROP COLUMN "player_1_id";--> statement-breakpoint
ALTER TABLE "matches" DROP COLUMN "player_2_id";--> statement-breakpoint
ALTER TABLE "matches" DROP COLUMN "player_1_name";--> statement-breakpoint
ALTER TABLE "matches" DROP COLUMN "player_2_name";--> statement-breakpoint
ALTER TABLE "matches" DROP COLUMN "player_1_session_id";--> statement-breakpoint
ALTER TABLE "matches" DROP COLUMN "player_2_session_id";--> statement-breakpoint
ALTER TABLE "matches" DROP COLUMN "bot_strategy";--> statement-breakpoint
ALTER TABLE "matches" DROP COLUMN "state";--> statement-breakpoint
ALTER TABLE "matches" DROP COLUMN "action_history";--> statement-breakpoint
ALTER TABLE "matches" DROP COLUMN "transaction_log";--> statement-breakpoint
ALTER TABLE "matches" DROP COLUMN "lifecycle_events";--> statement-breakpoint
ALTER TABLE "matches" DROP COLUMN "event_log";--> statement-breakpoint
ALTER TABLE "matches" DROP COLUMN "event_log_fingerprint";--> statement-breakpoint
ALTER TABLE "match_actions" DROP COLUMN "state_hash_before";--> statement-breakpoint
ALTER TABLE "match_actions" DROP COLUMN "events";