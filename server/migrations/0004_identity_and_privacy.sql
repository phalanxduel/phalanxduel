ALTER TABLE "users" ADD COLUMN "reminder_notifications" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verified_at" timestamp;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "marketing_consent_at" timestamp;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "legal_consent_version" text;
