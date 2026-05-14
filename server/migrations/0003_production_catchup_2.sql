-- 0003_production_catchup_2.sql
-- Missing creator_ip from initial catchup.

ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "creator_ip" text;
