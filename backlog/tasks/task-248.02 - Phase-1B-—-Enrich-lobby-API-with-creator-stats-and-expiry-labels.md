---
id: TASK-248.02
title: Phase 1B — Enrich lobby API with creator stats and expiry labels
status: Done
assignee: []
created_date: '2026-04-29 02:05'
updated_date: '2026-04-30 19:21'
labels:
  - phase-1
  - api
  - server
milestone: m-3
dependencies:
  - TASK-248.01
references:
  - server/src/routes/matchmaking.ts
  - server/src/db/schema.ts
  - server/src/db/match-repo.ts
parent_task_id: TASK-248
priority: high
ordinal: 113000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Enrich the existing `GET /api/lobby/matches` endpoint so it returns everything the PUBLIC_LOBBY screen (TASK-248.04) needs in a single response — no extra client-side fetches required.

## Response changes

Extend `LobbyMatchSchema` in `server/src/routes/matchmaking.ts`:

```typescript
creatorStats: {
  eloRating: number;
  glickoRating: number;
  glickoRD: number;
  wins: number;
  losses: number;
  abandons: number;
  gamesPlayed: number;
  matchesCreated: number;
  successfulStarts: number;
} | null;
expiryStatus: 'fresh' | 'expiring' | 'expired' | 'recent_expired';
expiresAt: string | null;
```

Freshness bands (derived from `publicExpiresAt` + `now`):

- `fresh` — more than 15 min remaining
- `expiring` — 0–15 min remaining
- `expired` — past `publicExpiresAt` (any time)
- `recent_expired` — past `publicExpiresAt` AND within last 60 min (use this label when surfacing recently-expired entries)

Add query param `?includeRecentlyExpired=true` (default false) to include matches that expired within the last 60 minutes (`recent_expired`), shown after open/expiring entries. Older expired entries are never returned.

Sort: newest `createdAt` first for `fresh`/`expiring`; `recent_expired` entries trail, sorted by most-recently-expired first.

## Data sources

- Creator ELO/Glicko/W-L from `player_ratings` (already in `profileService.getPublicProfile`)
- `abandons`, `matchesCreated`, `successfulStarts` from TASK-248.01 new columns
- `publicExpiresAt` already on matches row
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 GET /api/lobby/matches returns creatorStats with elo, glicko, glickoRD, wins, losses, abandons, gamesPlayed, matchesCreated, successfulStarts
- [ ] #2 expiryStatus is one of fresh / expiring / expired / recent_expired
- [ ] #3 fresh = >15 min remaining, expiring = 0–15 min remaining, recent_expired = expired ≤60 min ago, expired = older
- [ ] #4 expiresAt ISO timestamp present on every entry
- [ ] #5 ?includeRecentlyExpired=true returns matches expired within last 60 min as recent_expired
- [ ] #6 Default (no param) omits all expired entries
- [ ] #7 Sort: newest-first for fresh/expiring, recent_expired entries trail (most-recently-expired first)
- [ ] #8 pnpm check passes
- [ ] #9 OpenAPI snapshot updated
<!-- AC:END -->
