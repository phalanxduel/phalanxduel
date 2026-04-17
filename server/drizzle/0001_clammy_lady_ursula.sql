ALTER TABLE "match_actions" ADD COLUMN "msg_id" text;--> statement-breakpoint
ALTER TABLE "transaction_logs" ADD COLUMN "msg_id" text;--> statement-breakpoint
CREATE UNIQUE INDEX "match_actions_msg_id_idx" ON "match_actions" USING btree ("match_id","msg_id");--> statement-breakpoint
CREATE UNIQUE INDEX "transaction_logs_msg_id_idx" ON "transaction_logs" USING btree ("match_id","msg_id");