# Rolling Ladder Design

**Date:** 2026-03-08
**Status:** Approved

## Overview

A 7-day rolling Elo ranking system covering both PvP and single-player (vs bot)
games. Ratings are recalculated fresh from a 1000 baseline using matches within
the window, then persisted to a historical snapshots table for trend tracking.
The `matches` table is the single source of truth for all game data.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Elo formula | Standard: `R' = R + K(S - E)` | Well-understood, proven at scale |
| K-factor | 32 | Standard for active/new players |
| Starting Elo | 1000 | Convention |
| Rolling window | 7 calendar days (UTC) | Builds mechanism without formalizing seasons |
| Recalculation method | Replay all matches in window from 1000 baseline | Fresh computation, no drift |
| Snapshot trigger | On match completion + refresh on stale query | Complete history + always-fresh leaderboard |
| Source of truth | Existing `matches` table | Single source, already stores full action/transaction logs |
| Bot Elo model | Fixed phantom ratings per difficulty | Same Elo engine for PvP and SP |

## Game Categories

| Category | Key | Opponent | Phantom Elo |
|----------|-----|----------|-------------|
| Player vs Player | `pvp` | Real player | N/A |
| SP: Random Bot | `sp-random` | `bot-random` | 600 |
| SP: Heuristic Bot | `sp-heuristic` | `bot-heuristic` | 1000 |

Future bot difficulties slot in by adding a new category and phantom rating.

## Elo Calculation

```text
E = 1 / (1 + 10^((R_opponent - R_player) / 400))
R' = R + K * (S - E)

K  = 32
S  = 1 (win), 0 (loss)
R_opponent = other player's current rolling Elo (PvP) or phantom rating (SP)
```

### Rolling Window Computation

1. Query `matches` for all completed games involving the player in the last 7
   days (UTC), ordered by `updated_at` ascending.
2. Start from baseline 1000.
3. For each match, compute `E` using the opponent's rolling Elo at that point
   (PvP) or the fixed phantom rating (SP).
4. Apply the Elo update.
5. Final value = player's current rolling Elo for that category.

For PvP, opponent rolling Elo is computed lazily (their own 7-day replay). To
avoid circular dependencies, use a simple approach: compute each player's
rolling Elo independently using opponent phantom = opponent's last snapshot Elo
(or 1000 if no snapshot exists).

## Data Model

### Schema change: `matches` table

Add one nullable column to track bot difficulty for category detection:

| Column | Type | Description |
|--------|------|-------------|
| `bot_strategy` | `text` (nullable) | `'random'` or `'heuristic'`; NULL for PvP |

Category derivation from existing + new fields:

- `bot_strategy IS NULL` and both `player_1_id` / `player_2_id` present → `pvp`
- `bot_strategy = 'random'` → `sp-random`
- `bot_strategy = 'heuristic'` → `sp-heuristic`

### New table: `elo_snapshots`

Historical record of computed rolling Elo ratings.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | PK, default random |
| `user_id` | uuid | FK to users |
| `category` | text | `'pvp'`, `'sp-random'`, `'sp-heuristic'` |
| `elo` | integer | Computed rolling Elo |
| `k_factor` | integer | K-factor used (32) |
| `window_days` | integer | Window size used (7) |
| `matches_in_window` | integer | Matches that contributed |
| `wins_in_window` | integer | Win count in window |
| `computed_at` | timestamp | When this snapshot was created |

Index on `(user_id, category, computed_at)` for efficient lookups.

### Existing tables used (no changes)

- **`matches`** — `outcome` (winner, victory type), `action_history` (full
  action log), `transaction_log` (state chain), `status`, `updated_at`
- **`users`** — `id`, `gamertag`, `elo` (existing column, untouched for now)

## Snapshot Computation Triggers

### On match completion (primary)

When a match transitions to `status = 'completed'`:

1. Identify the authenticated player(s) in the match.
2. Determine the category from `bot_strategy`.
3. For each authenticated player, compute their rolling Elo from the 7-day
   window.
4. Write an `elo_snapshots` row per player per category.

### On leaderboard query (staleness refresh)

When the leaderboard API is called:

1. Check each player's latest snapshot `computed_at` for the category.
2. If stale (e.g., older than 1 hour or older than their most recent match),
   recompute and write a fresh snapshot.
3. Return leaderboard sorted by `elo` descending.

## API Endpoints

| Method | Path | Returns |
|--------|------|---------|
| `GET` | `/api/ladder/:category` | Top 50 players by rolling Elo |
| `GET` | `/api/ladder/:category/:userId` | Player's rolling Elo + rank |
| `GET` | `/api/stats/:userId/history` | Recent match history (all categories) |

### `GET /api/ladder/:category`

```json
{
  "category": "pvp",
  "window_days": 7,
  "computed_at": "2026-03-08T00:00:00Z",
  "rankings": [
    {
      "rank": 1,
      "user_id": "uuid",
      "gamertag": "Dragon#1",
      "elo": 1247,
      "matches": 12,
      "wins": 9
    }
  ]
}
```

### `GET /api/stats/:userId/history`

```json
{
  "user_id": "uuid",
  "gamertag": "Dragon#1",
  "categories": {
    "pvp": { "current_elo": 1247, "matches": 12, "wins": 9 },
    "sp-random": { "current_elo": 1085, "matches": 5, "wins": 5 },
    "sp-heuristic": { "current_elo": 1032, "matches": 8, "wins": 5 }
  },
  "recent_matches": [
    {
      "match_id": "uuid",
      "category": "pvp",
      "opponent": "Warrior#3",
      "result": "win",
      "victory_type": "lpDepletion",
      "completed_at": "2026-03-08T14:30:00Z"
    }
  ]
}
```

## Client UI

### Lobby leaderboard

- Tab or panel in the lobby with tabs: **PvP** | **SP: Random** | **SP: Heuristic**
- Shows top 50 ranked players per category
- Each row: rank, gamertag, rolling Elo, matches played, win count
- Accessible without auth (public); only authenticated players appear on it

### Player profile

- Rolling Elo per category
- Match history with outcomes
- Rating trend (from `elo_snapshots` history)

## Excluded (YAGNI)

- Seasons and resets (tracked in TASK-23 under TASK-34 ranked roadmap coordination)
- Elo-based matchmaking (PHX-MATCH-001)
- Rating decay for inactivity
- Placement matches or provisional ratings
- Cron-based daily recalculation
- Derived stats beyond win/loss (future: can mine `action_history` for richer stats)
