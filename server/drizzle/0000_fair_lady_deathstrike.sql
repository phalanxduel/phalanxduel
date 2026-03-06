CREATE TABLE "matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_1_id" uuid,
	"player_2_id" uuid,
	"player_1_name" text NOT NULL,
	"player_2_name" text NOT NULL,
	"config" jsonb NOT NULL,
	"state" jsonb,
	"action_history" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"transaction_log" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"outcome" jsonb,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"elo" integer DEFAULT 1000 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_player_1_id_users_id_fk" FOREIGN KEY ("player_1_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_player_2_id_users_id_fk" FOREIGN KEY ("player_2_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;