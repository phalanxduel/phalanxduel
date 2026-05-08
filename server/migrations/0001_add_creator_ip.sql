-- Phalanx Duel — Add creator_ip to matches (v1.2.0)
-- Distributed-ready match manager hardening.

--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "creator_ip" text;
