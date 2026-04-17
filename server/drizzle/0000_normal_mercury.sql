CREATE TABLE "admin_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid NOT NULL,
	"action" text NOT NULL,
	"target_id" uuid,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "elo_snapshots" (
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
CREATE TABLE "match_actions" (
	"match_id" uuid NOT NULL,
	"sequence_number" integer NOT NULL,
	"action" jsonb NOT NULL,
	"state_hash_before" text NOT NULL,
	"state_hash_after" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "match_actions_match_id_sequence_number_pk" PRIMARY KEY("match_id","sequence_number")
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_1_id" uuid,
	"player_2_id" uuid,
	"player_1_name" text,
	"player_2_name" text,
	"bot_strategy" text,
	"config" jsonb NOT NULL,
	"state" jsonb,
	"action_history" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"transaction_log" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"outcome" jsonb,
	"event_log" jsonb,
	"event_log_fingerprint" text,
	"final_state_hash" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transaction_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"sequence_number" integer NOT NULL,
	"action" jsonb NOT NULL,
	"state_hash_before" text NOT NULL,
	"state_hash_after" text NOT NULL,
	"events" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gamertag" text NOT NULL,
	"gamertag_normalized" text NOT NULL,
	"suffix" integer,
	"gamertag_changed_at" timestamp,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"elo" integer DEFAULT 1000 NOT NULL,
	"favorite_suit" text,
	"tagline" text,
	"avatar_icon" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "admin_audit_log" ADD CONSTRAINT "admin_audit_log_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "elo_snapshots" ADD CONSTRAINT "elo_snapshots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_actions" ADD CONSTRAINT "match_actions_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_player_1_id_users_id_fk" FOREIGN KEY ("player_1_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_player_2_id_users_id_fk" FOREIGN KEY ("player_2_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_logs" ADD CONSTRAINT "transaction_logs_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "elo_snapshots_user_category_idx" ON "elo_snapshots" USING btree ("user_id","category","computed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "match_seq_idx" ON "transaction_logs" USING btree ("match_id","sequence_number");--> statement-breakpoint
CREATE UNIQUE INDEX "gamertag_unique_idx" ON "users" USING btree ("gamertag_normalized","suffix");