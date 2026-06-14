---
id: TASK-313
title: V2-GODOT-003 - Define PlayerIntent and LegalAction protocol
status: To Do
assignee: []
created_date: '2026-06-14 05:24'
labels: []
milestone: m-14
dependencies:
  - TASK-312
priority: high
ordinal: 154000
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Shared schema created for PlayerIntent and LegalAction
- [ ] #2 Protocol ensures Godot submits intent rather than computing rules
- [ ] #3 Server validates intents against engine state
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
