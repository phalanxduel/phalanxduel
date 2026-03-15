---
id: TASK-45.1
title: Engine Event Derivation
status: Done
assignee:
  - '@claude'
created_date: '2026-03-15 18:09'
updated_date: '2026-03-15 19:02'
labels:
  - event-log
  - engine
  - determinism
dependencies: []
references:
  - engine/src/turns.ts
  - engine/src/events.ts
  - engine/src/index.ts
  - shared/src/schema.ts
  - shared/src/telemetry.ts
  - engine/tests/events.test.ts
parent_task_id: TASK-45
priority: high
ordinal: 17000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The engine already captures all information needed for a structured event log
inside `TransactionLogEntry`: `phaseTrace` records every phase hop (from/trigger/to),
and `details` carries a typed union with `CombatLogEntry` (including every
`CombatLogStep`) for attacks, and deploy/reinforce/pass/forfeit detail for other
actions. This data is never projected into `PhalanxEvent[]`.

This task adds a single pure function `deriveEventsFromEntry` in a new
`engine/src/events.ts` module. It is the only source of truth for converting
game-turn data into structured events. Because it is pure (no I/O, no side
effects), it is deterministic: the same `TransactionLogEntry` always produces
the same `PhalanxEvent[]`.

This task is entirely additive — no existing code is changed. It unblocks
TASK-45.2 (server wiring).

### Critical architecture note

Event IDs **must not use `crypto.randomUUID()`**. IDs are derived as
`${matchId}:seq${sequenceNumber}:ev${index}` so that replaying a match produces
identical event IDs and the log is independently verifiable without DB state.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 `deriveEventsFromEntry(entry, matchId)` exists in `engine/src/events.ts`
  and is exported from `engine/src/index.ts`.
- [x] #2 For an `attack` action the function emits:
  - `span_started` events for each phase hop in `phaseTrace`
  - one `functional_update` per `CombatLogStep` with target, damage, hp deltas,
    bonuses, and destroyed flag in the payload
  - `span_ended` for the final phase hop
- [x] #3 For `deploy`, `reinforce`, `pass`, `forfeit`, and `system:init` actions
  the function emits at minimum a `functional_update` with the relevant detail
  fields and `span_started`/`span_ended` events for phase hops.
- [x] #4 All event IDs follow the deterministic pattern
  `${matchId}:seq${sequenceNumber}:ev${index}`.
- [x] #5 Event `name` values use constants from `shared/src/telemetry.ts`
  (`TelemetryName.*`), not freehand strings.
- [x] #6 Replaying the same `TransactionLogEntry` twice produces byte-identical
  `PhalanxEvent[]` (tested).
- [x] #7 All emitted events pass `PhalanxEventSchema.parse()` without error.
- [x] #8 `pnpm --filter @phalanxduel/engine test` passes with new tests in
  `engine/tests/events.test.ts`.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Create `engine/src/events.ts`:

   ```typescript
   import type { TransactionLogEntry, PhalanxEvent } from '@phalanxduel/shared';
   import { TelemetryName } from '@phalanxduel/shared';

   export function deriveEventsFromEntry(
     entry: TransactionLogEntry,
     matchId: string,
   ): PhalanxEvent[]
   ```

2. Build the event array in order:
   - Iterate `entry.phaseTrace` → emit `span_started` + `span_ended` pairs.
     The `parentId` of each span is the turn span ID
     (`${matchId}:seq${entry.sequenceNumber}:turn`).
   - Switch on `entry.details.type`:
     - `attack`: emit one `functional_update` per `CombatLogStep`; parentId = attack span
     - `deploy`: emit one `functional_update` with `gridIndex`, `phaseAfter`
     - `reinforce`: emit one `functional_update` with column, gridIndex, cardsDrawn
     - `pass`: emit one `functional_update`
     - `forfeit`: emit one `functional_update` with `winnerIndex`
     - `system:init`: emit one `functional_update` with no payload body

3. Assign IDs deterministically: `${matchId}:seq${entry.sequenceNumber}:ev${i}`.

4. Use `entry.timestamp` as the event timestamp throughout (frozen per turn).

5. Export from `engine/src/index.ts`:
   ```typescript
   export { deriveEventsFromEntry } from './events.js';
   ```

6. Write `engine/tests/events.test.ts`:
   - Use `replayGame` + a known seed to get a real `TransactionLogEntry`
   - Assert event count, IDs, schema validity, and determinism
   - Cover all `details.type` branches
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
### What changed

**New files:**

- `engine/src/events.ts` — pure `deriveEventsFromEntry(entry, matchId): PhalanxEvent[]`
- `engine/tests/events.test.ts` — 37 tests (29 unit + 8 integration)

**Modified files:**

- `shared/src/telemetry.ts` — 6 new `TelemetryName` constants:
  `EVENT_INIT`, `EVENT_DEPLOY`, `EVENT_COMBAT_STEP`, `EVENT_PASS`,
  `EVENT_REINFORCE`, `EVENT_FORFEIT`
- `engine/src/index.ts` — exports `deriveEventsFromEntry`
- `docs/system/dependency-graph.svg` — auto-regenerated (new module visible)

### Key design decisions

1. `system:init` sets `details = { type: 'pass' }` in `turns.ts` as a
   placeholder. `deriveEventsFromEntry` detects it via `entry.action.type`
   before the `details.type` switch, so it emits `EVENT_INIT` correctly.
2. Optional `CombatLogStep` fields are spread conditionally — no `undefined`
   keys in payload, keeping events clean for consumers.
3. `span_ended` is emitted only for the final phase hop (one per entry), not
   per hop. This matches AC #2's "span_ended for the final phase hop".

### Scope boundary

This task is entirely additive. The server still sets `events: []` at
`server/src/match.ts:557,575`. The actual population of `PhalanxTurnResult.events`
is TASK-45.2.

## Verification

### Commands to run

```bash
# Targeted: engine only
pnpm --filter @phalanxduel/engine test

# Full CI (typecheck + build + all tests + schema + docs)
pnpm check:ci
```

### Expected output

```text
Test Files  10 passed (10)
Tests       124 passed (124)
```

### QA steps

1. Run `pnpm --filter @phalanxduel/engine test` — all 124 tests pass.
2. Confirm the integration suite (`PHX-EV-001 Integration`) shows 8 passing
   tests covering seeds 42, 7, 1337, 99, 256.
3. Confirm the unit suite (`PHX-EV-001: deriveEventsFromEntry`) shows
   29 passing tests covering all AC branches.
4. Run `pnpm typecheck` — no errors (function signature is fully typed).
5. To manually inspect output, add a one-off script or use the REPL:

   ```ts
   import { deriveEventsFromEntry, replayGame } from '@phalanxduel/engine';
   const state = replayGame({ matchId: 'x', players: [...], rngSeed: 42 }, []).finalState;
   const entry = state.transactionLog[0]; // system:init entry
   console.log(deriveEventsFromEntry(entry, 'x'));
   ```

### Verification evidence

- `pnpm check:ci` passed locally on commit `625d9973`.
- 124 engine tests pass (was 87 before this task: +29 unit, +8 integration).
- Full suite: 506 tests pass across all packages (shared 32, engine 124,
  client 193, server 157).
<!-- SECTION:NOTES:END -->

## Risks and Unknowns

- `TelemetryName` constants cover spans and some events but may need additions
  for `deploy`, `reinforce`, and `forfeit`. Extend the constants rather than
  inlining freehand strings.
- `phaseTrace` may be empty for `system:init` in some paths — guard against
  undefined and emit at least the `functional_update`.
- The `CombatLogStep.bonuses` field is optional — handle gracefully in payload.
