---
id: TASK-172
title: >-
  Align emitted event spans and unrecoverable errors with the canonical event
  model
status: To Do
assignee: []
created_date: '2026-04-02 15:50'
updated_date: '2026-04-02 15:57'
labels: []
dependencies:
  - TASK-168
priority: high
ordinal: 1900
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
- [ ] #1 The emitted event stream and the documented event model describe the same turn/phase span structure with no ambiguous partial-span behavior left behind.
- [ ] #2 Unrecoverable invariant failures produce a deterministic `system_error` path, or the canonical rules are explicitly narrowed so that current runtime behavior is fully compliant.
- [ ] #3 Replay, event-log rendering, and public/admin event surfaces remain schema-valid after the change.
- [ ] #4 Regression coverage exists for deploy, attack, pass, and at least one unrecoverable-error path.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code updated
- [ ] #2 Tests updated
- [ ] #3 Rules updated if needed
- [ ] #4 Cross-surface alignment verified
<!-- DOD:END -->
