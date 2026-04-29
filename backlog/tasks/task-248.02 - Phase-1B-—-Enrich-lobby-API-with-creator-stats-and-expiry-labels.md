---
id: TASK-248.02
title: Phase 1B — Enrich lobby API with creator stats and expiry labels
status: Planned
assignee: []
created_date: '2026-04-29 02:05'
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
expiryStatus: 'fresh' | 'expiring' | 'expired';
expiresAt: string | null;
```

Freshness bands (derived from `publicExpiresAt`):
- `fresh` — more than 15 min remaining
- `expiring` — 0–15 min remaining
- `expired` — past `publicExpiresAt`

Add query param `?includeRecentlyExpired=true` (default false) to include matches that expired within the last 60 minutes, shown after open/expiring entries.

Sort: newest `createdAt` first for open/expiring; expired entries trail sorted by most-recently-expired first.

## Data sources

- Creator ELO/Glicko/W-L from `player_ratings` (already in `profileService.getPublicProfile`)
- `abandons`, `matchesCreated`, `successfulStarts` from TASK-248.01 new columns
- `publicExpiresAt` already on matches row
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 GET /api/lobby/matches returns creatorStats with elo, glicko, glickoRD, wins, losses, abandons, gamesPlayed, matchesCreated, successfulStarts
- [ ] #2 expiryStatus is fresh >15 min, expiring 0-15 min, expired past publicExpiresAt
- [ ] #3 expiresAt ISO timestamp present on every entry
- [ ] #4 ?includeRecentlyExpired=true returns matches expired within last 60 min
- [ ] #5 Default (no param) omits expired matches
- [ ] #6 Sort: newest-first for open/expiring, expired entries trail
- [ ] #7 pnpm check passes
- [ ] #8 OpenAPI snapshot updated
<!-- AC:END -->
