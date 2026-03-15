---
id: TASK-45.2
title: Server Event Wiring
status: To Do
assignee: []
created_date: '2026-03-15 18:09'
updated_date: '2026-03-15 18:09'
labels:
  - event-log
  - server
dependencies:
  - TASK-45.1
references:
  - server/src/match.ts
  - engine/src/events.ts
  - shared/src/schema.ts
  - server/tests/
parent_task_id: TASK-45
priority: high
ordinal: 2000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
After TASK-45.1 ships, `deriveEventsFromEntry` is available but never called.
This task wires it through the server so that every `PhalanxTurnResult` broadcast
carries a real, non-empty `events` array.

Two call sites in `server/src/match.ts` currently hard-code `events: []`:
- Line ~557 in `broadcastState` (player broadcast)
- Line ~575 in `broadcastState` (spectator broadcast)

And `handleAction` (line ~451) already extracts `lastEntry` from
`postState.transactionLog` but discards it after Sentry breadcrumbs. That entry
is the input to `deriveEventsFromEntry`.

This is the task that resolves **TASK-44.3** (Event Model Docs-Code Alignment):
once it merges, `server/src/match.ts` emits real events consistent with the
documented model, and the docs-vs-runtime gap is closed by implementation.

### Architecture decision

`broadcastState` currently reconstructs `PhalanxTurnResult` from scratch. To
carry events through, the derived events should be computed inside `handleAction`
(which owns the `lastEntry`) and stored on the `MatchInstance` as `lastEvents`
(or passed as a parameter to `broadcastState`). The `lastEvents` approach is
simpler and avoids re-deriving on every broadcast.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 After any `handleAction` call, `PhalanxTurnResult.events` is a
  non-empty `PhalanxEvent[]` for all action types.
- [ ] #2 Both player and spectator broadcasts in `broadcastState` send the
  derived events, not `[]`.
- [ ] #3 The `system:init` action (game start) emits at least one event.
- [ ] #4 Existing server tests pass; new server test asserts `result.events`
  is non-empty after `handleAction`.
- [ ] #5 `pnpm --filter @phalanxduel/server test` passes.
- [ ] #6 TASK-44.3 acceptance criterion #3 is satisfied: server emits events
  consistent with the documented model.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. In `server/src/match.ts`:
   - Import `deriveEventsFromEntry` from `@phalanxduel/engine`.
   - After `applyAction` in `handleAction`, extract `lastEntry` and call:
     ```typescript
     const derivedEvents = lastEntry
       ? deriveEventsFromEntry(lastEntry, matchId)
       : [];
     ```
   - Store on the match instance: `match.lastEvents = derivedEvents`.
   - In the `GameTelemetry.recordAction` return value, include `events: derivedEvents`.

2. In `broadcastState`, replace `events: []` with `events: match.lastEvents ?? []`.

3. Add `lastEvents?: PhalanxEvent[]` to the `MatchInstance` type.

4. Add a server test: create a match, apply a deploy action, assert
   `result.events.length > 0` and all events pass schema validation.
<!-- SECTION:PLAN:END -->

## Risks and Unknowns

- `broadcastState` is called for reconnecting players who missed prior turns —
  `lastEvents` only reflects the most recent action, which is correct for the
  real-time WS protocol. Historical events are a persistence concern (TASK-45.4).
- The `MatchInstance` type extension increases the public API surface of
  `server/src/match.ts`. Ensure it is not inadvertently exported.

## Verification

```bash
pnpm --filter @phalanxduel/server test
pnpm typecheck
pnpm lint
pnpm check:ci
```

After merge, update TASK-44.3 status to Done.
