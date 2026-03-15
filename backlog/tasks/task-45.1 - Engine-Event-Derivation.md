---
id: TASK-45.1
title: Engine Event Derivation
status: To Do
assignee: []
created_date: '2026-03-15 18:09'
updated_date: '2026-03-15 18:09'
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
ordinal: 1000
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
- [ ] #1 `deriveEventsFromEntry(entry, matchId)` exists in `engine/src/events.ts`
  and is exported from `engine/src/index.ts`.
- [ ] #2 For an `attack` action the function emits:
  - `span_started` events for each phase hop in `phaseTrace`
  - one `functional_update` per `CombatLogStep` with target, damage, hp deltas,
    bonuses, and destroyed flag in the payload
  - `span_ended` for the final phase hop
- [ ] #3 For `deploy`, `reinforce`, `pass`, `forfeit`, and `system:init` actions
  the function emits at minimum a `functional_update` with the relevant detail
  fields and `span_started`/`span_ended` events for phase hops.
- [ ] #4 All event IDs follow the deterministic pattern
  `${matchId}:seq${sequenceNumber}:ev${index}`.
- [ ] #5 Event `name` values use constants from `shared/src/telemetry.ts`
  (`TelemetryName.*`), not freehand strings.
- [ ] #6 Replaying the same `TransactionLogEntry` twice produces byte-identical
  `PhalanxEvent[]` (tested).
- [ ] #7 All emitted events pass `PhalanxEventSchema.parse()` without error.
- [ ] #8 `pnpm --filter @phalanxduel/engine test` passes with new tests in
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

## Risks and Unknowns

- `TelemetryName` constants cover spans and some events but may need additions
  for `deploy`, `reinforce`, and `forfeit`. Extend the constants rather than
  inlining freehand strings.
- `phaseTrace` may be empty for `system:init` in some paths — guard against
  undefined and emit at least the `functional_update`.
- The `CombatLogStep.bonuses` field is optional — handle gracefully in payload.

## Verification

```bash
pnpm --filter @phalanxduel/engine test
pnpm typecheck
pnpm lint
```
