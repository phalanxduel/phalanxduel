---
id: TASK-325
title: V2-GODOT-015 - Retain Preact as reference client
status: Done
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
- [x] #1 Preact continues to work for all v1-parity features
- [x] #2 Godot and Preact pass identical protocol-level regression tests
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Code builds without errors (pnpm build)
- [x] #2 Linting and typechecking pass (pnpm lint and pnpm typecheck)
- [x] #3 All unit and integration tests pass (pnpm test:run:all)
- [x] #4 API schemas and types are re-generated and verified (pnpm schema:gen and scripts/ci/verify-schema.sh)
- [x] #5 Documentation artifacts are updated (pnpm docs:artifacts)
- [x] #6 Automated verification scripts pass (FSM consistency and event log coverage)
<!-- DOD:END -->
