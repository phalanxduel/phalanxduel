---
id: TASK-318
title: V2-GODOT-008 - Implement playable deploy/select/action vertical slice
status: Icebox
assignee: []
created_date: '2026-06-14 05:30'
updated_date: '2026-07-03 19:00'
labels: []
milestone: m-14
dependencies:
  - TASK-313
  - TASK-317
priority: high
ordinal: 159000
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Player hand renders
- [ ] #2 Can select and deploy cards via intent submission
- [ ] #3 Board updates after action confirmation
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
