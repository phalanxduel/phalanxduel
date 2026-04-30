---
id: TASK-248.08
title: Phase 4A — Match replay API
status: Done
assignee:
  - '@codex'
created_date: '2026-04-29 02:08'
updated_date: '2026-04-30 19:21'
labels:
  - phase-4
  - api
  - server
  - rewatch
milestone: m-3
dependencies: []
references:
  - server/src/routes/matches.ts
  - server/src/db/match-repo.ts
  - server/src/db/schema.ts
parent_task_id: TASK-248
priority: medium
ordinal: 119000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add two endpoints that together enable server-side match replay — allowing the REWATCH screen to show any historical match state at any step.

## Endpoint 1 — `GET /api/matches/:id/actions`

Returns the full ordered action log for a completed match. Public (no auth required for completed matches). Includes enough information to replay the match client-side in future.

Response:
```typescript
{
  matchId: string;
  engineVersion: string;      // from build metadata, for future versioning
  seed: number;
  startingLifepoints: number;
  player1Name: string;
  player2Name: string;
  totalActions: number;
  actions: {
    sequenceNumber: number;
    type: string;
    playerIndex: number;
    timestamp: string;
    stateHashBefore: string;
    stateHashAfter: string;
  }[];
}
```

Data source: `transaction_logs` table (already has all this data).

## Endpoint 2 — `GET /api/matches/:id/replay?step=N`

Re-runs the first N actions from the seeded initial state using the game engine and returns the resulting `GameState` snapshot.

- Step 0 → initial state (before any action)
- Step N → state after N-th action
- If N exceeds total action count, return the final state
- Only available for completed matches (status = completed)

Uses `matches.config` (has `rngSeed`) + `matches.actionHistory` (or `transaction_logs`) to reconstruct state.

## Key files

- `server/src/routes/matches.ts` — add both endpoints
- `server/src/db/match-repo.ts` — `getTransactionLog` already exists; add `getActionLog` if needed
- Engine: `applyAction` from `@phalanxduel/engine` to step through actions
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 GET /api/matches/:id/actions returns ordered action log with sequenceNumber, type, playerIndex, timestamp, stateHashBefore, stateHashAfter
- [x] #2 Action log endpoint requires no auth for completed matches
- [x] #3 GET /api/matches/:id/replay?step=N returns GameState after N actions
- [x] #4 step=0 returns initial state
- [x] #5 step beyond total action count returns final state
- [x] #6 Replay endpoint returns 404 for non-existent or non-completed matches
- [x] #7 pnpm check passes
- [x] #8 OpenAPI snapshot updated
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
2026-04-30 implementation plan: add public `/api/matches/:id/actions` and `/api/matches/:id/replay?step=N` routes in `server/src/routes/matches.ts` without changing the existing admin `/matches/:matchId/replay`. Reuse `MatchRepository.getMatch()` and `getTransactionLog()` for persisted completed matches, fall back to in-memory completed matches for no-DB tests, filter out the internal `system:init` action for the public action list, and replay the first N public actions with `replayGame`. Add route tests for unauthenticated access, ordered action fields, step 0, overlarge step, and 404 on unknown/non-completed matches, update OpenAPI snapshot, then run targeted server tests/typecheck and `rtk pnpm check`.
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented the public completed-match replay API without changing the existing Basic Auth admin `/matches/:matchId/replay` route.

Added:
- `GET /api/matches/:id/actions`: public completed-match action log with engine version, seed, starting lifepoints, player names, total action count, and ordered public action entries containing sequenceNumber, type, playerIndex, timestamp, stateHashBefore, and stateHashAfter.
- `GET /api/matches/:id/replay?step=N`: deterministic replay to a requested public action step using `replayGame`; step 0 returns the initialized pre-player-action state, overlarge steps clamp to the final state, and unknown/non-completed matches return 404.

Implementation uses persisted completed matches and transaction logs when available, with in-memory completed-match fallback for no-DB/test environments. The public action list filters out internal `system:init`; engine replay applies initialization itself so step counts map to user-visible actions.

Verification:
- `rtk pnpm --filter @phalanxduel/server exec tsc --noEmit`
- `rtk pnpm --filter @phalanxduel/server exec vitest run tests/match-replay-api.test.ts tests/replay.test.ts` (9/9)
- `rtk pnpm --filter @phalanxduel/server exec vitest run tests/openapi.test.ts -u`, then `tests/match-replay-api.test.ts tests/openapi.test.ts tests/replay.test.ts` passed (10/10)
- `rtk pnpm docs:artifacts`
- `rtk pnpm check` passed full verification: lint, typecheck, all package tests (shared 107, engine 210, admin 4, client 193, server 315), Go client checks, schema/rules checks, replay verification 20/20, playthrough verification 12/12 with zero warnings/errors, docs check, markdown lint, and formatting.
<!-- SECTION:FINAL_SUMMARY:END -->
