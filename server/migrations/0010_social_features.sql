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
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_follower_id_users_id_fk" FOREIGN KEY ("follower_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_following_id_users_id_fk" FOREIGN KEY ("following_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "match_favorites" ADD CONSTRAINT "match_favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "match_favorites" ADD CONSTRAINT "match_favorites_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "match_ratings" ADD CONSTRAINT "match_ratings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "match_ratings" ADD CONSTRAINT "match_ratings_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "match_comments" ADD CONSTRAINT "match_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "match_comments" ADD CONSTRAINT "match_comments_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_follows_follower_idx" ON "user_follows" USING btree ("follower_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_follows_following_idx" ON "user_follows" USING btree ("following_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "match_favorites_user_idx" ON "match_favorites" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "match_favorites_match_idx" ON "match_favorites" USING btree ("match_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "match_ratings_match_idx" ON "match_ratings" USING btree ("match_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "match_comments_match_idx" ON "match_comments" USING btree ("match_id","step");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "match_comments_user_idx" ON "match_comments" USING btree ("user_id");
