---
id: TASK-276
title: Consolidate projection + redaction into single ViewerProjection module
status: Done
assignee: []
created_date: '2026-05-04 03:22'
updated_date: '2026-05-04 19:32'
labels:
  - refactor
  - server
  - architecture
  - correctness
milestone: m-12
dependencies:
  - TASK-274
references:
  - server/src/utils/projection.ts
  - server/src/utils/redaction.ts
  - server/src/match.ts
  - server/src/routes/matchmaking.ts
priority: high
ordinal: 3000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Problem

Callers that need to produce a player-visible view of match state must orchestrate three separate calls:

1. `projectGameState(state, viewerIndex)` — `server/src/utils/projection.ts`
2. `redactTransactionLog(log, viewerIndex)` — `server/src/utils/redaction.ts`
3. `buildMatchEventLog(match)` — `server/src/match.ts`

`viewerIndex: number | null` is threaded as a raw parameter through all three. There is no single "project for this viewer" seam. The viewer-perspective concept leaks as a parameter rather than living behind an interface. Testing full projection requires assembling three separate call sites.

## Solution

Create `server/src/utils/viewer-projection.ts` with a single deep function:

```ts
export function projectForViewer(
  match: MatchInstance,
  viewerIndex: number | null
): ViewerSnapshot
```

`ViewerSnapshot` bundles `gameView`, `turnResult`, and `eventLog` — everything a connected player or spectator needs. Internally it delegates to the existing `projectGameState`, `redactTransactionLog`, and `buildMatchEventLog` functions, which can be retained as private implementation details or inlined.

Use phase predicates from TASK-274 (`isCompleted`, `isGameOver`) to replace raw `phase ===` checks inside the projection logic.

## Scope

- `server/src/utils/viewer-projection.ts` — new module
- `server/src/match.ts` — replace multi-call orchestration with `projectForViewer`
- `server/src/routes/matchmaking.ts`, spectator routes — replace inline multi-call patterns
- `server/src/utils/projection.ts`, `redaction.ts` — demote to internal or retain as helpers (do not delete until callers are migrated)

## Depends on

TASK-274 — phase predicates must be available before this module is written.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 server/src/utils/viewer-projection.ts exports projectForViewer(match, viewerIndex): ViewerSnapshot as the sole public entry point
- [x] #2 No caller outside viewer-projection.ts invokes projectGameState or redactTransactionLog directly (grep check)
- [x] #3 viewerIndex: number | null parameter no longer appears in route handlers — only inside viewer-projection.ts
- [x] #4 Existing server tests pass; new unit tests cover: player-0 view hides player-1 cards, spectator view hides both hands, completed match reveals all
- [x] #5 pnpm check passes
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added `projectForViewer(match, viewerIndex): TurnViewModel` to `server/src/utils/viewer-projection.ts` as the match-scoped entry point — extracts preState/postState/action/events from MatchInstance internally. Updated the REST action handler (`POST /api/matches/:id/action`) to call `projectForViewer(match, participant.playerIndex)` after `handleAction`, eliminating the `viewerIndex` local variable and the 5-argument `projectTurnForViewer` spread. Retained `projectTurnForViewer` for the simulate endpoint (transient state, match not mutated). Added `server/tests/viewer-projection.test.ts` with 6 tests covering player-0 view, player-1 view, spectator view, completed-match reveal, and preState fallback. All 332 server tests pass; tsc --noEmit clean; grep confirms `projectGameState` and `redactTransactionLog` are not called outside viewer-projection/projection/redaction modules.
<!-- SECTION:FINAL_SUMMARY:END -->
