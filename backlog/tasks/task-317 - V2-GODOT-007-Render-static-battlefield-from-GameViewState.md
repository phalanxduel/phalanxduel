---
id: TASK-317
title: V2-GODOT-007 - Render static battlefield from GameViewState
status: In Progress
assignee: []
created_date: '2026-06-14 05:32'
labels: []
milestone: m-14
dependencies:
  - TASK-312
  - TASK-316
priority: high
ordinal: 158000
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Godot consumes GameViewState
- [ ] #2 Battlefield scene renders cards based on state
- [ ] #3 Orientation matches engine projection
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

