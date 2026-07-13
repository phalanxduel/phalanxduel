---
id: TASK-343.05
title: Emit Authoritative Ordered Calculation Provenance
status: To Do
assignee: []
created_date: '2026-07-13 14:00'
updated_date: '2026-07-13 14:00'
labels:
  - gameplay
  - mathematical-narration
  - shared
  - engine
dependencies:
  - TASK-343.01
  - TASK-343.02
documentation:
  - docs/gameplay/rules.md
  - docs/reference/test-constitution.md
  - docs/architecture/principles.md
parent_task_id: TASK-343
priority: high
ordinal: 190800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Make mathematical explanation a first-class replay-safe gameplay artifact. Each resolved combat operation records its stable rule identifier, ordered operator, named inputs, result, target quantity, and observer visibility so verification and presentation consume the same evidence.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Combat resolution emits ordered structured calculation provenance for absorption overflow modifiers clamps HP and LP changes
- [ ] #2 Every calculation step references a stable normative rule identifier
- [ ] #3 Calculation chains satisfy arithmetic closure and step continuity
- [ ] #4 Preview live execution and replay emit identical provenance for identical inputs
- [ ] #5 Calculation provenance participates in event integrity and schema generation
- [ ] #6 No presentation caller must recalculate authoritative damage
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code builds without errors (pnpm build)
- [ ] #2 Linting and typechecking pass (pnpm lint and pnpm typecheck)
- [ ] #3 All unit and integration tests pass (pnpm test:run:all)
- [ ] #4 API schemas and types are re-generated and verified (pnpm schema:gen and scripts/ci/verify-schema.sh)
- [ ] #5 Documentation artifacts are updated (pnpm docs:artifacts)
- [ ] #6 Automated verification scripts pass (FSM consistency and event log coverage)
<!-- DOD:END -->
