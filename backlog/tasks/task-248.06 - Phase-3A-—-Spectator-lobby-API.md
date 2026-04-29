---
id: TASK-248.06
title: Phase 3A — Spectator lobby API
status: Planned
assignee: []
created_date: '2026-04-29 02:07'
labels:
  - phase-3
  - api
  - server
  - spectator
milestone: m-3
dependencies:
  - TASK-248.02
references:
  - server/src/routes/matchmaking.ts
  - server/src/match.ts
  - server/src/match-types.ts
parent_task_id: TASK-248
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add a `GET /api/spectator/matches` endpoint that returns the full list of watchable matches — active games in progress plus pending matches waiting for a second player (joinable as a spectator once both players sit down).

## Response shape

```typescript
{
  matchId: string;
  status: 'waiting' | 'active';   // waiting = 1 player seated, active = both players in
  phase: string | null;           // current game phase if active
  turnNumber: number | null;
  player1Name: string | null;
  player2Name: string | null;     // null if waiting
  spectatorCount: number;
  createdAt: string;
  updatedAt: string;
}[]
```

## Filtering

Support query params:
- `?status=waiting` — only matches with one player seated
- `?status=active` — only active in-progress matches
- `?status=all` (default) — both

Both in-memory matches (loaded in MatchManager) and DB-persisted active/pending matches should be included. De-duplicate by matchId. Sort: active matches first (by most-recently-updated), then waiting matches.

## Key files

- `server/src/routes/matches.ts` or a new `server/src/routes/spectator.ts` — add GET /api/spectator/matches
- `server/src/match.ts` — may need a `listSpectatorMatches()` helper
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 GET /api/spectator/matches returns active and waiting matches
- [ ] #2 Each entry includes matchId, status, phase, turnNumber, player names, spectatorCount, createdAt, updatedAt
- [ ] #3 ?status=waiting returns only 1-player matches
- [ ] #4 ?status=active returns only 2-player active matches
- [ ] #5 ?status=all (default) returns both
- [ ] #6 Active matches sorted before waiting, both sorted by updatedAt desc
- [ ] #7 pnpm check passes
- [ ] #8 OpenAPI snapshot updated
<!-- AC:END -->
