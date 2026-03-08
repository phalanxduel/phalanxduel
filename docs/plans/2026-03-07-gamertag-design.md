# Gamertag System Design

**Date:** 2026-03-07
**Status:** Approved
**Reference:** Microsoft Xbox Gamertag system

## Overview

Add a gamertag identity system inspired by Xbox Gamertags. Players choose a
display name at registration. If the name is already taken, sequential suffixes
disambiguate (`Dragon#1`, `Dragon#2`). The canonical identity throughout the
system remains `user.id` (UUID); the gamertag is a display concern.

## Decisions

| Decision | Choice |
|----------|--------|
| Model | Xbox Gamertag: display name + auto-suffix |
| Change cooldown | 7 days |
| Character set | ASCII only: `[a-zA-Z0-9 _-]` |
| Suffix style | Sequential (`#1`, `#2`, `#3`) |
| First collision | Both users get suffixed (OG gets `#1`) |
| Set at | Registration (existing `name` field becomes gamertag) |
| Match history | Canonical identity is `user.id`, gamertag resolved at display time |
| Guest players | Unchanged, free-text warrior name |
| Content filter | Blocklist: profanity, hate speech, political terms |

## Data Model

### Users table changes

| Column | Type | Description |
|--------|------|-------------|
| `gamertag` | `text NOT NULL` | Display name, 3-20 chars |
| `gamertag_normalized` | `text NOT NULL` | Lowercase, spaces/hyphens/underscores stripped |
| `suffix` | `integer` | `NULL` if unique, `1`+ after first collision |
| `gamertag_changed_at` | `timestamp` | Last change time, `NULL` = never changed |

- **Unique constraint** on `(gamertag_normalized, suffix)`.
- Replaces existing `name` column.
- Display format: `Dragon Slayer` (no suffix) or `Dragon Slayer#3` (with suffix).

### Normalization

Lowercase, strip spaces, hyphens, and underscores.

- `"Dragon_Slayer"` -> `"dragonslayer"`
- `"dragon slayer"` -> `"dragonslayer"`
- `"DragonSlayer"` -> `"dragonslayer"`

All three would collide and receive sequential suffixes.

## Validation Rules

- 3-20 characters.
- ASCII only: letters, numbers, spaces, hyphens, underscores.
- Must contain at least one letter.
- No leading/trailing whitespace, no consecutive spaces.
- Content filter applied to normalized form.

## Content Filter

Server-side blocklist applied at registration and gamertag change. Categories:

- **Profanity** - obscenities, slurs.
- **Hate speech** - racial, ethnic, religious, gender-based slurs.
- **Political** - political figures (especially US), parties, slogans, movements, ideological terms.

Rejection returns a generic `"That gamertag is not available"`. No indication of
which rule triggered to avoid gaming the filter.

Filter applied against the normalized form so tricks like `D_r u_g s` do not
bypass detection.

## Registration Flow

1. Validate gamertag format (3-20 chars, ASCII, at least one letter).
2. Run content filter against normalized form. Reject if matched.
3. Normalize: lowercase + strip spaces/hyphens/underscores.
4. Query: `SELECT MAX(suffix) FROM users WHERE gamertag_normalized = $1`.
5. If no rows: name is unique, `suffix = NULL`.
6. If rows exist with `suffix = NULL`: update existing user to `suffix = 1`.
   New user gets `suffix = 2`.
7. If rows exist with numeric suffixes: new user gets `MAX(suffix) + 1`.
8. Use a transaction to prevent race conditions.
9. Store `gamertag`, `gamertag_normalized`, `suffix`, `gamertag_changed_at = NOW()`.

## Gamertag Change Flow

**Endpoint:** `POST /api/auth/gamertag`

1. Authenticate via JWT.
2. Check cooldown: reject if `gamertag_changed_at` < 7 days ago.
3. Validate and filter new gamertag (same as registration).
4. Normalize, check collisions, assign suffix (same logic).
5. Handle suffix gaps: if the user was the only holder of their old normalized
   name and had a suffix, that suffix slot is freed (no backfill needed).
6. Update user row. Return updated user object.

## Display Locations

| Location | Behavior |
|----------|----------|
| Lobby auth area | `Dragon#1 (ELO: 1000)` |
| Warrior name input | Auto-populated, read-only for authenticated users |
| Match creation/join | Server authoritative: uses gamertag from DB for auth users |
| In-game labels | Formatted gamertag |
| Match history | `player_1_id`/`player_2_id` canonical, gamertag resolved at read |
| Guest players | Free-text warrior name, unchanged |

## Shared Helper

```text
formatGamertag(gamertag, suffix) -> suffix ? `${gamertag}#${suffix}` : gamertag
```

Used by server and client. Lives in `shared/`.

## Migration

- Rename `name` -> `gamertag` in users table.
- Populate `gamertag_normalized` from existing names.
- Detect collisions in existing data and assign sequential suffixes.
- Set `gamertag_changed_at = NULL` so existing users can change immediately.

## Security

- All validation is server-side; client validates for UX only.
- Authenticated users' names always resolved from DB. Client-sent
  `playerName` in WebSocket messages is ignored for authenticated users.
- Suffix assignment wrapped in a database transaction.
