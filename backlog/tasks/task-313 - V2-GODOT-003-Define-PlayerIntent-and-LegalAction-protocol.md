---
id: TASK-313
title: V2-GODOT-003 - Define PlayerIntent and LegalAction protocol
status: Done
assignee: []
created_date: '2026-06-14 05:24'
updated_date: '2026-06-14 05:47'
labels: []
milestone: m-14
dependencies:
  - TASK-312
priority: high
ordinal: 154000
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Shared schema created for PlayerIntent and LegalAction
- [x] #2 Protocol ensures Godot submits intent rather than computing rules
- [x] #3 Server validates intents against engine state
- [x] #4 Add AnimationCue and AudioCue schema definitions to protocol
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
