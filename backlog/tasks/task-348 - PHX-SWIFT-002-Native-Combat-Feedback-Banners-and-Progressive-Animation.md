---
id: TASK-348
title: PHX-SWIFT-002 - Native Combat Feedback Banners and Progressive Animation
status: To Do
assignee: []
created_date: '2026-07-25 00:33'
labels: []
dependencies:
  - TASK-347
priority: high
ordinal: 213800
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Consume TurnViewModel calculation provenance (causeTags, events, preState, postState)
- [ ] #2 Animate floating combat verdict banners and column power shifts
- [ ] #3 Turn playback desync check passes cleanly
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
