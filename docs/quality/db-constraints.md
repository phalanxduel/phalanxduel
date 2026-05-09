# DB Constraint Inventory

Source of truth: `server/src/db/schema.ts` (Drizzle ORM) and `server/migrations/0000_baseline.sql`.

This document records every structural constraint enforced at the persistence layer, and flags domain invariants that are not yet backed by a database constraint.

---

## `users`

| Column | Constraint | Note |
|---|---|---|
| `id` | PRIMARY KEY (uuid) | |
| `gamertag` | NOT NULL | |
| `gamertag_normalized` | NOT NULL | Lowercased form used for uniqueness |
| `email` | UNIQUE, NOT NULL | |
| `password_hash` | NOT NULL | |
| `elo` | NOT NULL, DEFAULT 1000 | |
| `email_notifications` | NOT NULL, DEFAULT true | |
| `reminder_notifications` | NOT NULL, DEFAULT true | |
| `is_admin` | NOT NULL, DEFAULT false | |
| `matches_created` | NOT NULL, DEFAULT 0 | |
| `successful_starts` | NOT NULL, DEFAULT 0 | |
| `login_failed_attempts` | NOT NULL, DEFAULT 0 | |
| `is_disabled` | NOT NULL, DEFAULT false | |
| `created_at` | NOT NULL, DEFAULT NOW() | |
| `updated_at` | NOT NULL, DEFAULT NOW() | |
| `favorite_suit` | ENUM ('spades','hearts','diamonds','clubs') or NULL | |

**Indexes:**
- `gamertag_unique_idx` — UNIQUE on (`gamertag_normalized`, `suffix`)

**Domain invariants without DB constraints:**
- `elo >= 0` — Elo can theoretically be driven to zero by losses; no CHECK constraint enforces a floor
- `login_failed_attempts >= 0` — No CHECK; would need `CHECK (login_failed_attempts >= 0)`
- `matches_created >= 0` — No CHECK

---

## `matches`

| Column | Constraint | Note |
|---|---|---|
| `id` | PRIMARY KEY (uuid) | |
| `player_1_id` | FK → `users.id` (nullable) | Nullable to support guest/anonymous players |
| `player_2_id` | FK → `users.id` (nullable) | Same |
| `visibility` | NOT NULL, DEFAULT 'private', ENUM ('private','public_open') | |
| `public_status` | ENUM ('open','claimed','expired','cancelled') or NULL | |
| `requires_established_rating` | NOT NULL, DEFAULT false | |
| `config` | NOT NULL (jsonb) | `MatchParameters` — not structurally validated at DB level |
| `action_history` | NOT NULL, DEFAULT [] (jsonb) | |
| `transaction_log` | NOT NULL, DEFAULT [] (jsonb) | |
| `status` | NOT NULL, DEFAULT 'pending', ENUM ('pending','active','completed','cancelled') | |
| `bot_strategy` | ENUM ('random','heuristic','mcts') or NULL | |
| `created_at` | NOT NULL, DEFAULT NOW() | |
| `updated_at` | NOT NULL, DEFAULT NOW() | |

**Indexes:**
- `matches_visibility_status_idx` — on (`visibility`, `public_status`, `created_at`)

**Domain invariants without DB constraints:**
- No CHECK that `player_2_id IS NULL` when `bot_strategy IS NOT NULL` (bot matches should not have a real second player)
- No CHECK that `status = 'completed'` implies `outcome IS NOT NULL`
- `config` and `state` are JSONB blobs — structure is enforced only by application code and Zod
- `final_state_hash` is nullable even for completed matches; no constraint enforces its presence at completion

---

## `transaction_logs`

| Column | Constraint | Note |
|---|---|---|
| `id` | PRIMARY KEY (uuid) | |
| `match_id` | NOT NULL, FK → `matches.id` | |
| `sequence_number` | NOT NULL | |
| `action` | NOT NULL (jsonb) | |
| `state_hash_before` | NOT NULL | |
| `state_hash_after` | NOT NULL | |
| `events` | NOT NULL (jsonb) | |
| `created_at` | NOT NULL, DEFAULT NOW() | |

**Indexes:**
- `match_seq_idx` — UNIQUE on (`match_id`, `sequence_number`) — enforces replay integrity
- `transaction_logs_msg_id_idx` — UNIQUE on (`match_id`, `msg_id`) — idempotency guard

**Domain invariants without DB constraints:**
- `sequence_number >= 0` — No CHECK

---

## `match_actions`

| Column | Constraint | Note |
|---|---|---|
| `match_id` | NOT NULL, FK → `matches.id` | |
| `sequence_number` | NOT NULL | |
| `action` | NOT NULL (jsonb) | |
| `state_hash_before` | NOT NULL | |
| `state_hash_after` | NOT NULL | |
| `created_at` | NOT NULL, DEFAULT NOW() | |

**Primary key:** (`match_id`, `sequence_number`)

**Indexes:**
- `match_actions_msg_id_idx` — UNIQUE on (`match_id`, `msg_id`) — idempotency guard

**Domain invariants without DB constraints:**
- `sequence_number >= 0` — No CHECK

---

## `elo_snapshots`

| Column | Constraint | Note |
|---|---|---|
| `id` | PRIMARY KEY (uuid) | |
| `user_id` | NOT NULL, FK → `users.id` | |
| `category` | NOT NULL, ENUM ('pvp','sp-random','sp-heuristic','sp-mcts') | |
| `elo` | NOT NULL | |
| `k_factor` | NOT NULL | |
| `window_days` | NOT NULL | |
| `matches_in_window` | NOT NULL | |
| `wins_in_window` | NOT NULL | |
| `computed_at` | NOT NULL, DEFAULT NOW() | |

**Indexes:**
- `elo_snapshots_user_category_idx` — on (`user_id`, `category`, `computed_at`)

**Domain invariants without DB constraints:**
- `k_factor > 0` — No CHECK
- `wins_in_window <= matches_in_window` — No CHECK

---

## `player_ratings`

| Column | Constraint | Note |
|---|---|---|
| `user_id` | NOT NULL, FK → `users.id` | |
| `mode` | NOT NULL, ENUM ('pvp','sp-random','sp-heuristic','sp-mcts') | |
| `elo_rating` | NOT NULL, DEFAULT 1000 | |
| `glicko_rating` | NOT NULL, DEFAULT 1500 | |
| `glicko_rating_deviation` | NOT NULL, DEFAULT 350 | |
| `glicko_volatility` | NOT NULL, DEFAULT 0.06 | |
| `games_played` | NOT NULL, DEFAULT 0 | |
| `wins` | NOT NULL, DEFAULT 0 | |
| `losses` | NOT NULL, DEFAULT 0 | |
| `draws` | NOT NULL, DEFAULT 0 | |
| `abandons` | NOT NULL, DEFAULT 0 | |
| `provisional` | NOT NULL, DEFAULT true | |
| `created_at` | NOT NULL, DEFAULT NOW() | |
| `updated_at` | NOT NULL, DEFAULT NOW() | |

**Primary key:** (`user_id`, `mode`)

**Domain invariants without DB constraints:**
- `wins + losses + draws + abandons <= games_played` — No CHECK
- `glicko_rating_deviation > 0` — No CHECK
- `glicko_volatility > 0` — No CHECK

---

## `match_results`

| Column | Constraint | Note |
|---|---|---|
| `match_id` | NOT NULL, FK → `matches.id` | |
| `user_id` | NOT NULL, FK → `users.id` | |
| `opponent_id` | FK → `users.id` (nullable) | Nullable for bot opponents |
| `mode` | NOT NULL, ENUM ('pvp','sp-random','sp-heuristic','sp-mcts') | |
| `result` | NOT NULL, ENUM ('win','loss','draw') | |
| `elo_before` | NOT NULL | |
| `elo_after` | NOT NULL | |
| `elo_delta` | NOT NULL | |
| `glicko_before` | NOT NULL | |
| `glicko_after` | NOT NULL | |
| `glicko_rd_before` | NOT NULL | |
| `glicko_rd_after` | NOT NULL | |
| `created_at` | NOT NULL, DEFAULT NOW() | |

**Primary key:** (`match_id`, `user_id`)

**Indexes:**
- `match_results_match_idx` — on (`match_id`)
- `match_results_user_created_idx` — on (`user_id`, `created_at`)

**Domain invariants without DB constraints:**
- `elo_delta = elo_after - elo_before` — No CHECK; computed by application

---

## `achievements`

| Column | Constraint | Note |
|---|---|---|
| `id` | PRIMARY KEY (uuid) | |
| `user_id` | NOT NULL, FK → `users.id` | |
| `type` | NOT NULL | Achievement key string |
| `awarded_at` | NOT NULL, DEFAULT NOW() | |
| `metadata` | NOT NULL, DEFAULT {} (jsonb) | |

**Indexes:**
- `achievements_user_id_awarded_at_idx` — on (`user_id`, `awarded_at`)
- `achievements_user_type_unique_idx` — UNIQUE on (`user_id`, `type`) — prevents duplicate awards

---

## `user_follows`

| Primary key | (`follower_id`, `following_id`) | |
|---|---|---|
| `follower_id` | NOT NULL, FK → `users.id` | |
| `following_id` | NOT NULL, FK → `users.id` | |
| `created_at` | NOT NULL, DEFAULT NOW() | |

**Domain invariants without DB constraints:**
- No CHECK that `follower_id != following_id` — a user can follow themselves

---

## `match_favorites` / `match_ratings` / `match_comments`

These are social/engagement tables. All have NOT NULL FKs to `users` and `matches`, and composite primary keys or unique indexes. No domain-critical invariants missing at the DB level beyond what is already enforced.

---

## `match_payloads` / `match_embeddings`

| Table | Key constraint | Note |
|---|---|---|
| `match_payloads` | PK = `match_id`, FK → `matches.id` | Written once at archive; never mutated |
| `match_embeddings` | PK = `match_id`, FK → `matches.id` | Vector column (1536 dims) |

---

## `admin_audit_log` / `password_reset_tokens` / `identity_audit_log`

All have NOT NULL FKs and timestamp fields. `password_reset_tokens` has `expires_at NOT NULL` and `token_hash NOT NULL`.

---

## Gap Summary

| Gap | Table | Missing constraint | Priority |
|---|---|---|---|
| Elo floor | `users` | `CHECK (elo >= 0)` | Low |
| Sequence number floor | `transaction_logs`, `match_actions` | `CHECK (sequence_number >= 0)` | Low |
| Self-follow prevention | `user_follows` | `CHECK (follower_id != following_id)` | Low |
| Bot/player exclusivity | `matches` | `CHECK (player_2_id IS NULL OR bot_strategy IS NULL)` | Medium |
| Completed match outcome | `matches` | `CHECK (status != 'completed' OR outcome IS NOT NULL)` | Medium |
| k_factor sanity | `elo_snapshots` | `CHECK (k_factor > 0)` | Low |
| Rating arithmetic | `player_ratings` | `CHECK (wins + losses + draws + abandons <= games_played)` | Low |

None of these gaps create data corruption risk under the current application code. They are defense-in-depth constraints for resilience against future bugs or direct DB writes.
