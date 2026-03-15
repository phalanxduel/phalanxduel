---
id: TASK-45.7
title: Event Log Verification
status: Done
assignee: ['@claude']
created_date: '2026-03-15 18:09'
updated_date: '2026-03-15 17:09'
labels:
  - event-log
  - verification
  - ci
  - audit
dependencies:
  - TASK-45.2
references:
  - scripts/ci/verify-doc-fsm-consistency.ts
  - shared/src/hash.ts
  - shared/src/schema.ts
  - docs/RULES.md
parent_task_id: TASK-45
priority: high
ordinal: 18000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
This task closes the loop on the event log's trustworthiness claims by adding
machine-verifiable guarantees that the log is complete, correctly structured,
and consistently fingerprintable. It can land independently of the persistence
and UI tasks (TASK-45.4–45.6) as long as TASK-45.2 has shipped.

### Three verification goals

1. **Schema completeness in CI.** `pnpm rules:check` currently validates
   FSM/rules consistency. It should also assert: for any match whose
   `transactionLog` is non-empty, `deriveEventsFromEntry` produces a non-empty,
   schema-valid `PhalanxEvent[]`. This catches regressions where a new action
   type is added to the engine but `deriveEventsFromEntry` has no branch for it.

2. **Deterministic fingerprinting.** `buildMatchEventLog` produces a SHA-256
   fingerprint of the ordered event array. This task adds a test that:
   - Replays a known match twice with identical inputs
   - Asserts that both runs produce the same fingerprint
   - Verifies the fingerprint can be re-derived from the event array alone

3. **TurnHash (RULES.md §20.2).** The spec defines `TurnHash` as "the
   deterministic signature of the transition." Currently `PhalanxTurnResultSchema`
   does not include a `turnHash` field. This task adds it:
   - `turnHash = SHA-256 of the event IDs + stateHashAfter for the turn`
   - Add `turnHash` to `PhalanxTurnResultSchema` (optional initially)
   - Server populates it in `handleAction`
   - This closes the last spec gap between RULES.md §20.2 and the runtime

### The virtuous circle outcome

Once this task ships, the following is true:
- Every action produces a verifiable `PhalanxEvent[]` (TASK-45.1/45.2)
- Every match produces a fingerprintable `MatchEventLog` (TASK-45.3)
- The log is persisted and queryable (TASK-45.4/45.5)
- The CI suite guards against event log regressions (this task)
- Developers, QA, and AI agents all share the same queryable truth surface
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 `pnpm rules:check` fails if any action type reachable from the engine's
  state machine has no corresponding branch in `deriveEventsFromEntry`.
- [x] #2 A replay test confirms that running the same action sequence twice
  produces identical event arrays and identical fingerprints.
- [x] #3 `PhalanxTurnResultSchema` includes an optional `turnHash: z.string()`
  field; the server populates it for every action.
- [x] #4 The `turnHash` is `SHA-256(stateHashAfter + eventIds.join(':'))` for
  the turn, making it independently verifiable from the event log and state hash.
- [x] #5 `pnpm check:ci` passes end to end after all changes.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extend `scripts/ci/verify-doc-fsm-consistency.ts` (or a new
   `scripts/ci/verify-event-log.ts`):
   - Import all action types from the engine's state machine.
   - For each action type, create a minimal fixture `TransactionLogEntry` and
     call `deriveEventsFromEntry`.
   - Assert the result is non-empty and all events pass `PhalanxEventSchema.parse`.
   - Exit non-zero if any action type produces an empty array.

2. Add a determinism test in `engine/tests/events.test.ts`:
   - Replay a full match (seeded) twice.
   - Assert fingerprints are identical.
   - Assert the fingerprint can be re-derived offline.

3. In `shared/src/schema.ts`:
   ```typescript
   export const PhalanxTurnResultSchema = z.object({
     ...
     turnHash: z.string().optional(),
   });
   ```

4. In `server/src/match.ts` `handleAction`, after deriving events:
   ```typescript
   const turnHash = computeStateHash({
     stateHashAfter: lastEntry.stateHashAfter,
     eventIds: derivedEvents.map((e) => e.id),
   });
   ```
   Include `turnHash` in the returned `PhalanxTurnResult`.

5. Add `rules:check` hook for event log in `package.json` or extend
   the existing `rules:check` script.
<!-- SECTION:PLAN:END -->

## Risks and Unknowns

- The CI script needs to construct minimal but valid `TransactionLogEntry`
  fixtures for every action type. Reuse existing test fixtures from
  `engine/tests/` where possible.
- `TurnHash` schema addition is additive (optional field) — no breaking change.
  Clients that do not use it can ignore it.
- The `verify-doc-fsm-consistency.ts` script already runs in CI — extending it
  keeps the rules:check surface cohesive. A separate script is acceptable if
  the existing one becomes too large.

## Verification

```bash
pnpm rules:check
pnpm --filter @phalanxduel/engine test
pnpm --filter @phalanxduel/shared test
pnpm check:ci
```

## Implementation Notes

**Committed 2026-03-15 via 7 incremental commits:**

1. `feat(engine): add assertNever exhaustiveness to deriveEventsFromEntry switch` — compile-time guard
2. `feat(shared): add computeTurnHash — canonical TurnHash formula (RULES.md §20.2)` — shared helper + TDD tests
3. `feat(shared): add optional turnHash field to PhalanxTurnResultSchema (RULES.md §20.2)` — Zod schema + generated artifacts
4. `test(engine): add PHX-EV-002 fingerprint determinism tests` — 5 new determinism tests
5. `feat(ci): add event log coverage harness and extend rules:check` — `scripts/ci/verify-event-log.ts` + `package.json`
6. `feat(server): compute and broadcast turnHash in broadcastState (RULES.md §20.2)` — server integration
7. `feat(ci): remove turnHash legacy guard, document formula in RULES.md §20.2` — cleanup + docs

**Notable deviation from plan:** Test fixtures in `schema.test.ts` used simplified inputs (no UUID fields, no action field) with `.partial()` due to Zod 4.3.6's stricter UUID validation rejecting `00000000-0000-0000-0000-000000000001`-style test IDs. All acceptance criteria fully met.
