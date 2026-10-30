---
id: TASK-172
title: >-
  Align emitted event spans and unrecoverable errors with the canonical event
  model
status: Done
assignee:
  - '@codex'
created_date: '2026-04-02 15:50'
updated_date: '2026-04-02 21:05'
labels: []
dependencies:
  - TASK-168
priority: high
ordinal: 88000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Context
The runtime event model is only partially aligned with the rules contract. Event derivation emits `span_started` for each phase hop but only a single final `span_ended`, and the audit found no runtime emission path for canonical `system_error` events with `unrecoverable_error` status.

## Evidence
- Rule IDs: R-17, R-18
- Audit sections: Phase 3, Phase 5, Phase 7, Phase 8
- Code: `engine/src/events.ts`, `shared/src/schema.ts`, `server/src/routes/matches.ts`
- Search evidence on 2026-04-02 found schema and rendering support for `system_error` / `unrecoverable_error`, but no runtime producer outside the schema definitions.

## Impact
- determinism
- integrity
- maintainability
- consistency

## Metadata
- Surface: engine, server, shared, docs, tests
- Type: bug, consistency, documentation
- Priority: high
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The emitted event stream and the documented event model describe the same turn/phase span structure with no ambiguous partial-span behavior left behind.
- [x] #2 Unrecoverable invariant failures produce a deterministic `system_error` path, or the canonical rules are explicitly narrowed so that current runtime behavior is fully compliant.
- [x] #3 Replay, event-log rendering, and public/admin event surfaces remain schema-valid after the change.
- [x] #4 Regression coverage exists for deploy, attack, pass, and at least one unrecoverable-error path.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inspect the current engine event derivation, transaction-log schema, and server event-log projection/rendering paths to confirm the exact span/error mismatch and identify every outward-facing surface that depends on `PhalanxEvent`.
2. Update the successful turn-event derivation path so phase-hop spans are emitted with an unambiguous paired structure that matches the canonical rules text, then revise engine tests to cover deploy, attack, pass, reinforce, and forfeit against the new span semantics.
3. Add a deterministic unrecoverable-error emission path at the action/log boundary, preferring a canonical shared+engine representation if the schema can support it cleanly; if discovery shows that would create disproportionate contract churn, narrow the rules/doc text and use the smallest deterministic compliant runtime path instead.
4. Propagate the chosen event model through server event-log building, redaction, compact/full rendering, and turn/view-model projection so public, participant, and admin surfaces remain schema-valid and behaviorally aligned.
5. Update canonical documentation and any generated/schema-backed artifacts affected by the contract change so docs, schemas, and runtime behavior describe the same model.
6. Run targeted engine/server tests first, then broader verification with `rtk bin/check`, and record verification evidence plus any residual risk in the task before handing off for review.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-04-02: Approved plan recorded after discovery. Initial implementation order is span pairing first, then unrecoverable-error handling, then server/docs/test alignment.

2026-04-02: Reworked turn-event derivation so every `phaseTrace` hop emits a paired `span_started`/`span_ended` structure with a stable `payload.spanId`, and functional updates now attach to a concrete phase span when one exists instead of leaving the turn/phase relationship ambiguous.

2026-04-02: Added a deterministic unrecoverable-error path in `MatchManager.handleAction()`. Validated actions that still hit engine/runtime invariants now append a canonical `system_error` event with `status: unrecoverable_error`, persist it into the match event log, and block subsequent actions on that match.

2026-04-02: Updated canonical rules docs to describe paired phase-hop spans and the synthesized action-boundary `system_error` behavior when a fatal invariant failure occurs before a transaction-log entry can be committed.

2026-04-02 verification: `rtk pnpm --filter @phalanxduel/engine exec vitest run tests/events.test.ts`; `rtk pnpm --filter @phalanxduel/server exec vitest run tests/match-unrecoverable-error.test.ts tests/match.test.ts tests/match-log-routes.test.ts`; `rtk pnpm --filter @phalanxduel/server build`; `rtk pnpm exec eslint server/src/match.ts engine/src/events.ts engine/tests/events.test.ts server/tests/match-unrecoverable-error.test.ts server/src/routes/matches.ts`.

2026-04-02 verification: `rtk bin/check` now reaches the repo’s pre-existing lint blocker in `server/src/db/match-repo.ts` (`recoverPlayer` exceeds the configured `max-params` limit). No new task-local build/test/lint errors remain in the touched surfaces.

2026-04-02: Reworked turn-event derivation so every `phaseTrace` hop emits a paired `span_started`/`span_ended` structure with a stable `payload.spanId`, and functional updates now attach to a concrete phase span when one exists instead of leaving the turn/phase relationship ambiguous.

2026-04-02: Added a deterministic unrecoverable-error path in `MatchManager.handleAction()`. Validated actions that still hit engine/runtime invariants now append a canonical `system_error` event with `status: unrecoverable_error`, persist it into the match event log, and block subsequent actions on that match.

2026-04-02: Updated canonical rules docs to describe paired phase-hop spans and the synthesized action-boundary `system_error` behavior when a fatal invariant failure occurs before a transaction-log entry can be committed.

2026-04-02 verification: `rtk pnpm --filter @phalanxduel/engine exec vitest run tests/events.test.ts`; `rtk pnpm --filter @phalanxduel/server exec vitest run tests/match-unrecoverable-error.test.ts tests/match.test.ts tests/match-log-routes.test.ts`; `rtk pnpm --filter @phalanxduel/server build`; `rtk pnpm exec eslint server/src/match.ts engine/src/events.ts engine/tests/events.test.ts server/tests/match-unrecoverable-error.test.ts server/src/routes/matches.ts`.

2026-04-02 verification: `rtk bin/check` now reaches the repo’s pre-existing lint blocker in `server/src/db/match-repo.ts` (`recoverPlayer` exceeds the configured `max-params` limit). No new task-local build/test/lint errors remain in the touched surfaces.

2026-04-02: Reworked turn-event derivation so every `phaseTrace` hop emits a paired `span_started`/`span_ended` structure with a stable `payload.spanId`, and functional updates now attach to a concrete phase span when one exists instead of leaving the turn/phase relationship ambiguous.

2026-04-02: Added a deterministic unrecoverable-error path in `MatchManager.handleAction()`. Validated actions that still hit engine/runtime invariants now append a canonical `system_error` event with `status: unrecoverable_error`, persist it into the match event log, and block subsequent actions on that match.

2026-04-02: Updated canonical rules docs to describe paired phase-hop spans and the synthesized action-boundary `system_error` behavior when a fatal invariant failure occurs before a transaction-log entry can be committed.

2026-04-02 verification: `rtk pnpm --filter @phalanxduel/engine exec vitest run tests/events.test.ts`; `rtk pnpm --filter @phalanxduel/server exec vitest run tests/match-unrecoverable-error.test.ts tests/match.test.ts tests/match-log-routes.test.ts`; `rtk pnpm --filter @phalanxduel/server build`; `rtk pnpm exec eslint server/src/match.ts engine/src/events.ts engine/tests/events.test.ts server/tests/match-unrecoverable-error.test.ts server/src/routes/matches.ts`.

2026-04-02 verification: `rtk bin/check` now reaches the repo’s pre-existing lint blocker in `server/src/db/match-repo.ts` (`recoverPlayer` exceeds the configured `max-params` limit). No new task-local build/test/lint errors remain in the touched surfaces.

2026-04-02: Returned from Human Review to In Progress to reconcile generated documentation artifacts after `bin/check` advanced past the old lint blocker and exposed `docs/system/KNIP_REPORT.md` line-reference drift.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Aligned the runtime event model with the canonical phase-hop structure by emitting paired phase spans with stable span IDs, attaching functional updates to concrete phase spans, and adding a deterministic server-side `system_error` path for unrecoverable invariant failures that occur after validation but before a transaction log entry can be committed. Added engine and server regression coverage for deploy, attack, pass, and the new fatal-error path, and updated the rules documentation to match the implemented event semantics.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Code updated
- [x] #2 Tests updated
- [x] #3 Rules updated if needed
- [x] #4 Cross-surface alignment verified
<!-- DOD:END -->
