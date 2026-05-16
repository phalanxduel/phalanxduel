-- 0005_remove_redundant_indexes.sql
-- Removes redundant indexes covered by primary keys or multi-column indexes.
-- Optimized for write performance.

DROP INDEX IF EXISTS "match_favorites_user_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "match_results_match_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "player_ratings_user_mode_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "user_follows_follower_idx";
