---
id: TASK-248.09
title: Phase 4B — Match history list endpoint
status: Done
assignee:
  - '@codex'
created_date: '2026-04-29 02:08'
updated_date: '2026-04-30 22:24'
labels:
  - phase-4
  - api
  - server
  - rewatch
dependencies:
  - TASK-248.08
references:
  - server/src/routes/matches.ts
  - server/src/db/match-repo.ts
  - server/src/db/schema.ts
parent_task_id: TASK-248
priority: medium
ordinal: 118000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add `GET /api/matches/history` — a paginated list of completed matches available for rewatch. Feeds the REWATCH section of the SPECTATOR_LOBBY screen (TASK-248.10).

## Response

```typescript
{
  matches: {
    matchId: string;
    player1Name: string;
    player2Name: string;
    winnerName: string | null;
    totalTurns: number;
    completedAt: string;
    durationMs: number | null;
  }[];
  total: number;
  page: number;
  pageSize: number;
}
```

## Query params

- `?page=1&pageSize=20` (defaults)
- `?playerId=<uuid>` — filter to matches involving a specific player (for public profile rewatch tab)

## Data source

`matches` table where `status = 'completed'`, joined with `player_ratings` or `users` for names. `winnerName` derived from `finalStateHash` or `eventLog` (look for `game.completed` event with winner data).

## Key files

- `server/src/routes/matches.ts` — add GET /api/matches/history
- `server/src/db/match-repo.ts` — add `listCompletedMatches(page, pageSize, playerId?)` query
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 GET /api/matches/history returns paginated list of completed matches
- [x] #2 Each entry includes matchId, player names, winnerName, totalTurns, completedAt, durationMs
- [x] #3 ?page and ?pageSize params work correctly
- [x] #4 ?playerId filters to matches involving that player
- [x] #5 Results sorted by completedAt descending
- [x] #6 pnpm check passes
- [x] #7 OpenAPI snapshot updated
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
2026-04-30 implementation plan: add `CompletedMatchHistoryEntry`/page typing, implement `MatchRepository.listCompletedMatchHistory(page,pageSize,playerId?)` over `matches.status = completed` with optional player filter and completedAt descending sort, add `/api/matches/history` route with query validation/defaults and in-memory completed-match fallback for no-DB tests, derive winnerName from outcome winnerIndex, totalTurns from outcome/state, durationMs from updatedAt-createdAt, add route tests for pagination, player filter, fields, and sort order, update OpenAPI/routes docs, then run targeted server tests/typecheck and `rtk pnpm check`.
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented `GET /api/matches/history` for paginated public completed-match history feeding the future REWATCH UI.

Added `MatchRepository.listCompletedMatchHistory(page, pageSize, playerId?)` over completed match rows with optional player filter, completedAt-desc sorting, total count, winnerName derivation from outcome winnerIndex, totalTurns from outcome/state, and durationMs from persisted timestamps. The route validates/defaults `page` and `pageSize`, supports `playerId`, and falls back to in-memory completed matches for no-DB/test environments.

Verification:
- `rtk pnpm --filter @phalanxduel/server exec tsc --noEmit`
- `rtk pnpm --filter @phalanxduel/server exec vitest run tests/match-replay-api.test.ts` (6/6)
- `rtk pnpm --filter @phalanxduel/server exec vitest run tests/openapi.test.ts -u`, then `tests/match-replay-api.test.ts tests/openapi.test.ts` passed (7/7)
- `rtk pnpm docs:artifacts`
- First `rtk pnpm check` run hit a transient timeout in existing `tests/action-endpoint.test.ts`; the timed-out case passed alone and with the new replay/history tests.
- Rerun `rtk pnpm check` passed full verification: lint, typecheck, all package tests (shared 107, engine 210, admin 4, client 193, server 317), Go client checks, schema/rules checks, replay verification 20/20, playthrough verification 12/12 with zero warnings/errors, docs check, markdown lint, and formatting.
<!-- SECTION:FINAL_SUMMARY:END -->
