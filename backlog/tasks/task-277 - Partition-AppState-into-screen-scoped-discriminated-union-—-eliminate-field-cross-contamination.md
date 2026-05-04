---
id: TASK-277
title: >-
  Partition AppState into screen-scoped discriminated union — eliminate field
  cross-contamination
status: Ready
assignee: []
created_date: '2026-05-04 03:22'
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
- [ ] #1 AppState is a discriminated union; TypeScript narrows to the correct variant at each screen branch — no `as` casts to access screen-specific fields
- [ ] #2 rewatch fields (rewatchMatchId, rewatchStep, rewatchViewerIndex) do not exist on any non-rewatch screen variant
- [ ] #3 in-game fields (selectedAttacker, selectedDeployCard, gameState) do not exist on any non-game screen variant
- [ ] #4 All existing client tests pass; pnpm verify:quick passes
- [ ] #5 No new `null` guards added to components as a result of this change — field presence is guaranteed by the type
<!-- AC:END -->
