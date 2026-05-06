-- =============================================================================
-- Phalanx Duel — Baseline Schema (v1.0.0-rev.2)
--
-- This is a flattened, idempotent migration representing the full database
-- schema as deployed in production. It replaces the original 13 incremental
-- migration files (0000–0012).
--
-- On existing databases: The migrator detects legacy migration records and
-- replaces them with a single baseline record. No DDL is re-executed.
--
-- On fresh databases: All tables, indexes, constraints, and extensions are
-- created from scratch.
-- =============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS vector;

-- ─── Core Tables ──────────────────────────────────────────────────────────────

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
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
	"email_notifications" boolean DEFAULT true NOT NULL,
	"reminder_notifications" boolean DEFAULT true NOT NULL,
	"email_verified_at" timestamp,
	"marketing_consent_at" timestamp,
	"legal_consent_version" text,
	"is_admin" boolean DEFAULT false NOT NULL,
	"matches_created" integer DEFAULT 0 NOT NULL,
	"successful_starts" integer DEFAULT 0 NOT NULL,
	"login_failed_attempts" integer DEFAULT 0 NOT NULL,
	"login_locked_until" timestamp,
	"security_stamp" text,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_1_id" uuid,
	"player_2_id" uuid,
	"visibility" text DEFAULT 'private' NOT NULL,
	"public_status" text,
	"public_expires_at" timestamp,
	"min_public_rating" integer,
	"max_public_rating" integer,
	"min_games_played" integer,
	"requires_established_rating" boolean DEFAULT false NOT NULL,
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
	"last_action_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "transaction_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"sequence_number" integer NOT NULL,
	"action" jsonb NOT NULL,
	"state_hash_before" text NOT NULL,
	"state_hash_after" text NOT NULL,
	"events" jsonb NOT NULL,
	"msg_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "match_actions" (
	"match_id" uuid NOT NULL,
	"sequence_number" integer NOT NULL,
	"action" jsonb NOT NULL,
	"state_hash_before" text NOT NULL,
	"state_hash_after" text NOT NULL,
	"msg_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "match_actions_match_id_sequence_number_pk" PRIMARY KEY("match_id","sequence_number")
);

--> statement-breakpoint
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
CREATE TABLE IF NOT EXISTS "player_ratings" (
	"user_id" uuid NOT NULL,
	"mode" text NOT NULL,
	"elo_rating" integer DEFAULT 1000 NOT NULL,
	"glicko_rating" integer DEFAULT 1500 NOT NULL,
	"glicko_rating_deviation" integer DEFAULT 350 NOT NULL,
	"glicko_volatility" real DEFAULT 0.06 NOT NULL,
	"games_played" integer DEFAULT 0 NOT NULL,
	"wins" integer DEFAULT 0 NOT NULL,
	"losses" integer DEFAULT 0 NOT NULL,
	"draws" integer DEFAULT 0 NOT NULL,
	"abandons" integer DEFAULT 0 NOT NULL,
	"provisional" boolean DEFAULT true NOT NULL,
	"last_rated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "player_ratings_pkey" PRIMARY KEY("user_id","mode")
);

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "match_results" (
	"match_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"opponent_id" uuid,
	"mode" text NOT NULL,
	"result" text NOT NULL,
	"elo_before" integer NOT NULL,
	"elo_after" integer NOT NULL,
	"elo_delta" integer NOT NULL,
	"glicko_before" integer NOT NULL,
	"glicko_after" integer NOT NULL,
	"glicko_rd_before" integer NOT NULL,
	"glicko_rd_after" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "match_results_pkey" PRIMARY KEY("match_id","user_id")
);

-- ─── Admin & Identity Tables ──────────────────────────────────────────────────

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "admin_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid NOT NULL,
	"action" text NOT NULL,
	"target_id" uuid,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "identity_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"action" text NOT NULL,
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"ip_address" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- ─── Achievements ─────────────────────────────────────────────────────────────

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "achievements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"awarded_at" timestamp DEFAULT now() NOT NULL,
	"match_id" text,
	"metadata" jsonb DEFAULT '{}' NOT NULL
);

-- ─── Social Features ──────────────────────────────────────────────────────────

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_follows" (
	"follower_id" uuid NOT NULL,
	"following_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_follows_follower_id_following_id_pk" PRIMARY KEY("follower_id","following_id")
);

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "match_favorites" (
	"user_id" uuid NOT NULL,
	"match_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "match_favorites_user_id_match_id_pk" PRIMARY KEY("user_id","match_id")
);

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "match_ratings" (
	"user_id" uuid NOT NULL,
	"match_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "match_ratings_user_id_match_id_pk" PRIMARY KEY("user_id","match_id")
);

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "match_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"match_id" uuid NOT NULL,
	"step" integer,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- ─── Archive & Analytics ──────────────────────────────────────────────────────

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
CREATE TABLE IF NOT EXISTS "match_embeddings" (
	"match_id" uuid PRIMARY KEY,
	"embedding" vector(1536),
	"summary" text,
	"version" integer NOT NULL DEFAULT 1,
	"metadata" jsonb NOT NULL DEFAULT '{}',
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- ─── Foreign Key Constraints ──────────────────────────────────────────────────

--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "matches" ADD CONSTRAINT "matches_player_1_id_users_id_fk" FOREIGN KEY ("player_1_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "matches" ADD CONSTRAINT "matches_player_2_id_users_id_fk" FOREIGN KEY ("player_2_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transaction_logs" ADD CONSTRAINT "transaction_logs_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "match_actions" ADD CONSTRAINT "match_actions_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "elo_snapshots" ADD CONSTRAINT "elo_snapshots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "admin_audit_log" ADD CONSTRAINT "admin_audit_log_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "identity_audit_log" ADD CONSTRAINT "identity_audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "achievements" ADD CONSTRAINT "achievements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "player_ratings" ADD CONSTRAINT "player_ratings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "match_results" ADD CONSTRAINT "match_results_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "match_results" ADD CONSTRAINT "match_results_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "match_results" ADD CONSTRAINT "match_results_opponent_id_fkey" FOREIGN KEY ("opponent_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "match_payloads" ADD CONSTRAINT "match_payloads_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "match_embeddings" ADD CONSTRAINT "match_embeddings_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_follower_id_users_id_fk" FOREIGN KEY ("follower_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_following_id_users_id_fk" FOREIGN KEY ("following_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "match_favorites" ADD CONSTRAINT "match_favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "match_favorites" ADD CONSTRAINT "match_favorites_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "match_ratings" ADD CONSTRAINT "match_ratings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "match_ratings" ADD CONSTRAINT "match_ratings_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "match_comments" ADD CONSTRAINT "match_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "match_comments" ADD CONSTRAINT "match_comments_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ─── Indexes ──────────────────────────────────────────────────────────────────

--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "gamertag_unique_idx" ON "users" USING btree ("gamertag_normalized","suffix");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "match_seq_idx" ON "transaction_logs" USING btree ("match_id","sequence_number");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "transaction_logs_msg_id_idx" ON "transaction_logs" USING btree ("match_id","msg_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "match_actions_msg_id_idx" ON "match_actions" USING btree ("match_id","msg_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "elo_snapshots_user_category_idx" ON "elo_snapshots" USING btree ("user_id","category","computed_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "matches_visibility_status_idx" ON "matches" USING btree ("visibility","public_status","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "player_ratings_user_mode_idx" ON "player_ratings" USING btree ("user_id","mode");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "match_results_match_idx" ON "match_results" USING btree ("match_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "match_results_user_created_idx" ON "match_results" USING btree ("user_id","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "identity_audit_log_user_id_idx" ON "identity_audit_log" USING btree ("user_id","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "achievements_user_id_awarded_at_idx" ON "achievements" USING btree ("user_id","awarded_at");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "achievements_user_type_unique_idx" ON "achievements" USING btree ("user_id","type");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_follows_follower_idx" ON "user_follows" USING btree ("follower_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_follows_following_idx" ON "user_follows" USING btree ("following_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "match_favorites_user_idx" ON "match_favorites" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "match_favorites_match_idx" ON "match_favorites" USING btree ("match_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "match_ratings_match_idx" ON "match_ratings" USING btree ("match_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "match_comments_match_idx" ON "match_comments" USING btree ("match_id","step");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "match_comments_user_idx" ON "match_comments" USING btree ("user_id");
