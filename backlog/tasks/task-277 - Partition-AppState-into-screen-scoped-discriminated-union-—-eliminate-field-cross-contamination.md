---
id: TASK-277
title: >-
  Partition AppState into screen-scoped discriminated union — eliminate field
  cross-contamination
status: Verification
assignee:
  - '@codex'
created_date: '2026-05-04 03:22'
updated_date: '2026-05-04 23:19'
labels:
  - refactor
  - client
  - architecture
  - typescript
milestone: m-12
dependencies:
  - TASK-274
references:
  - client/src/state.ts
  - docs/adr/ADR-028-client-ui-ux-audit-and-remediation-plan.md
priority: high
ordinal: 4000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Problem

`client/src/state.ts` `AppState` holds 20+ fields for 11 screens in a flat bag. Rewatch fields (`rewatchMatchId`, `rewatchStep`, `rewatchViewerIndex`) coexist with in-game fields (`selectedAttacker`, `selectedDeployCard`, `gameState`). There are no transition guards — nothing prevents a `rewatch` screen from holding a stale `selectedAttacker`, or a `gameOver` screen from retaining a `rewatchStep`. Every UI component must null-guard all fields regardless of screen.

ADR-028 records the UI audit and remediation plan — this task is execution against it for the state layer.

## Solution

Refactor `AppState` into a discriminated union keyed on `screen`:

```ts
type AppState =
  | { screen: 'game'; gameState: GameState; selectedAttacker: GridPosition | null; selectedDeployCard: string | null; damageMode: DamageMode; isSpectator: false; spectatorCount: number }
  | { screen: 'spectator_lobby' | 'gameOver'; gameState: GameState; isSpectator: boolean; spectatorCount: number }
  | { screen: 'rewatch'; matchId: string; step: number; viewerIndex: number }
  | { screen: 'lobby' | 'waiting' | 'auth' | 'settings' | 'ladder' | 'profile' | 'public_lobby'; }
```

Fields shared across all screens (connectionState, user, operativeId, error, queueStatus, health) stay at the top level as a wrapper type.

Use phase predicates from TASK-274 where screen transitions are driven by `gs.phase`.

## Scope

- `client/src/state.ts` — refactor AppState type and initial state
- `client/src/` — update all components and hooks that read AppState fields to use narrowed types
- Remove rewatch/game field cross-contamination by construction

## Depends on

TASK-274 — phase predicates replace raw phase checks in state transition handlers.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 AppState is a discriminated union; TypeScript narrows to the correct variant at each screen branch — no `as` casts to access screen-specific fields
- [x] #2 rewatch fields (rewatchMatchId, rewatchStep, rewatchViewerIndex) do not exist on any non-rewatch screen variant
- [x] #3 in-game fields (selectedAttacker, selectedDeployCard, gameState) do not exist on any non-game screen variant
- [x] #4 All existing client tests pass; pnpm verify:quick passes
- [x] #5 No new `null` guards added to components as a result of this change — field presence is guaranteed by the type
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Preserve the internal flat AppState backing store while exposing screen-scoped AppState union types.
2. Narrow game, game-over, rewatch, renderer, and animation entry points before reading screen-specific fields.
3. Verify with client typecheck and `rtk pnpm verify:quick`; record any environment caveats.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-05-04 @codex: Continued the screen-scoped AppState refactor from previous WIP. Added explicit game/gameOver/rewatch state aliases at client render boundaries, narrowed renderer cache/floating-card logic by `state.screen`, reconstructed rewatch playback as either `game` or `gameOver` state, and guarded pizzazz game-over access before reading `gameState`. Verification so far: `rtk pnpm -C client typecheck` passed; `rtk pnpm -C client test` passed (24 files, 213 tests); `rtk pnpm verify:quick` passed build/lint/typecheck phases but failed docs artifact drift after regenerating `docs/system/dependency-graph.svg`, which is included in the WIP for commit. Earlier `rtk pnpm qa:playthrough:verify` completed the 12/12 playthrough matrix, then had to be stopped because the local OTel collector was absent and the process looped on `ECONNREFUSED 127.0.0.1:4318`.

2026-05-04 @codex: Committed TASK-277 slice as `6da5cb48 refactor(client): partition AppState by screen`. Post-commit verification: `rtk pnpm verify:quick` passed end-to-end, including build, lint, typecheck, docs artifact validation, markdown lint, and Prettier. Worktree is clean afterward. Note on AC #3: `gameOver` intentionally retains `gameState`, matching the task Solution example, while game-only interaction fields (`selectedAttacker`, `selectedDeployCard`) are limited to the `game` variant.
<!-- SECTION:NOTES:END -->
