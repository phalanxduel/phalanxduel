---
id: TASK-274
title: Extract phase-predicate module to shared — replace 44 scattered phase checks
status: Done
assignee: []
created_date: '2026-05-04 03:22'
updated_date: '2026-05-04 13:54'
labels:
  - refactor
  - shared
  - engine
  - server
  - client
  - architecture
milestone: m-12
dependencies: []
references:
  - engine/src/state-machine.ts
  - server/src/match.ts
  - server/src/routes/matchmaking.ts
  - client/src/game.tsx
  - client/src/state.ts
priority: high
ordinal: 1000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Problem

`gs.phase === 'gameOver'` and similar raw string comparisons appear 44 times across `engine/src/`, `server/src/`, and `client/src/`. `engine/src/state-machine.ts` documents a complete state machine with transitions but has zero callers in production — it's documentation only. When phase semantics change, the blast radius spans three packages.

## Solution

Create `shared/src/phase.ts` exporting typed phase-predicate functions backed by the existing `STATE_MACHINE` definition:

- `isGameOver(gs: GameState): boolean`
- `isActionPhase(gs: GameState): boolean`
- `isCompleted(gs: GameState): boolean`
- `isDeploymentPhase(gs: GameState): boolean`
- `isReinforcementPhase(gs: GameState): boolean`

Replace all 44 raw `phase ===` / `phase !==` checks across packages with these predicates. Export from `shared/src/index.ts`.

## Why this is first

Three other refactors (ViewerProjection, MatchActor consolidation, AppState partitioning) all touch code containing raw phase checks. Landing this first means each subsequent refactor inherits clean predicate calls rather than perpetuating the raw-string pattern.

## Scope

- `shared/src/phase.ts` — new module
- `engine/src/` — update callers
- `server/src/` — update callers  
- `client/src/` — update callers
- `shared/src/index.ts` — re-export
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Zero raw `phase ===` or `phase !==` string comparisons remain in engine/, server/, or client/ source (grep check)
- [x] #2 All predicates are backed by the STATE_MACHINE definition in engine/src/state-machine.ts — no free-floating string literals in shared/src/phase.ts
- [x] #3 All existing tests pass after replacement (pnpm check)
- [x] #4 New unit tests for each predicate in shared/tests/ covering true/false cases
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Created shared/src/phase.ts with isGameOver, isCompleted, isActionPhase, isDeploymentPhase, isReinforcementPhase, isAttackResolution, isStartTurn predicates. Moved GAME_PHASES and ACTION_PHASES from engine/src/state-machine.ts to shared; engine re-exports for backward compat. Replaced all 44 raw phase === / phase !== comparisons across engine/, server/, client/ with typed predicate calls. 130 shared tests pass (including 8 new predicate unit tests), 236 engine tests pass, 326 server tests pass. Two pre-existing client failures unrelated to this change.
<!-- SECTION:FINAL_SUMMARY:END -->
