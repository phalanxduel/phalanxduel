---
id: TASK-343.02
title: Resolve and Version Canonical Gameplay Semantic Gaps
status: To Do
assignee: []
created_date: '2026-07-13 14:00'
updated_date: '2026-07-13 14:00'
labels:
  - gameplay
  - rules
  - replay
dependencies:
  - TASK-343.01
documentation:
  - docs/gameplay/rules.md
  - docs/reference/test-constitution.md
  - docs/architecture/principles.md
parent_task_id: TASK-343
priority: high
ordinal: 187800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Resolve known gameplay ambiguities using the approved defaults while preserving historical replay compatibility. The corrected rule set uses shield-before-weapon ordering, shield-only Hearts, threshold semantics for pass loss, face-up competitive deployment, canonical face-card values, and a two-rank competitive Duel scope until generalized combat is verified.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Canonical equations unambiguously define suit operation order and clamping
- [ ] #2 Pass loss semantics and player-facing terminology agree
- [ ] #3 Competitive supported geometry and visibility semantics are explicit
- [ ] #4 Historical matches remain replayable under their recorded rules version
- [ ] #5 Positive negative and replay evidence cover each changed semantic
- [ ] #6 Documentation and generated contracts agree with the resolved rules
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
