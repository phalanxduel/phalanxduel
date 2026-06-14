---
id: TASK-321
title: V2-GODOT-011 - Implement replay frame viewer
status: To Do
assignee: []
created_date: '2026-06-14 05:30'
labels: []
milestone: m-14
dependencies:
  - TASK-314
  - TASK-318
priority: medium
ordinal: 162000
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Replay can rebuild match from frames
- [ ] #2 Scrubber controls (play, pause, step) implemented
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
