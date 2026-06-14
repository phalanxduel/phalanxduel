---
id: TASK-325
title: V2-GODOT-015 - Retain Preact as reference client
status: To Do
assignee: []
created_date: '2026-06-14 05:31'
labels: []
milestone: m-14
dependencies: []
priority: high
ordinal: 166000
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Preact continues to work for all v1-parity features
- [ ] #2 Godot and Preact pass identical protocol-level regression tests
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
