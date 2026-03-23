-- TASK-106: Durable Audit Trail — persist final state hash on match completion
ALTER TABLE "matches" ADD COLUMN "final_state_hash" text;
