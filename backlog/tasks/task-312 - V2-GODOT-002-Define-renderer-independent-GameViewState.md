---
id: TASK-312
title: V2-GODOT-002 - Define renderer-independent GameViewState
status: To Do
assignee: []
created_date: '2026-06-14 05:24'
labels: []
milestone: m-14
dependencies:
  - TASK-311
priority: high
ordinal: 153000
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Shared schema created for GameViewState
- [ ] #2 Schema covers turn, phase, visible cards, locations, legal actions, and targets
- [ ] #3 Preact reference client can consume the new schema without regression
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
