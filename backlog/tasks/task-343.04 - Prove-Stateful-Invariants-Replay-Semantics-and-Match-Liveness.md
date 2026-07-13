---
id: TASK-343.04
title: Prove Stateful Invariants Replay Semantics and Match Liveness
status: To Do
assignee: []
created_date: '2026-07-13 14:00'
updated_date: '2026-07-13 14:00'
labels:
  - gameplay
  - assurance
  - replay
dependencies:
  - TASK-343.02
  - TASK-343.03
documentation:
  - docs/gameplay/rules.md
  - docs/reference/test-constitution.md
  - docs/architecture/principles.md
parent_task_id: TASK-343
priority: high
ordinal: 189800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Extend gameplay assurance from isolated examples to generated legal action sequences, metamorphic relations, semantic replay equivalence, and a normative termination policy using repetition, no-progress, and hard-turn limits.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Generated legal sequences preserve card identity conservation HP and LP bounds phase legality and rejection integrity
- [ ] #2 Live preview and replay agree semantically with committed execution
- [ ] #3 Player and initiative mirroring properties are tested where symmetry is expected
- [ ] #4 Threefold repetition no-progress and hard-turn policies produce deterministic draws
- [ ] #5 Every legal match terminates under the supported normative rules
- [ ] #6 Mutation testing detects changes to fairness-critical predicates and arithmetic
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
