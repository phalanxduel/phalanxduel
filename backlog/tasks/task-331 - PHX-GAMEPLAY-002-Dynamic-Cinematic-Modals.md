---
id: TASK-331
title: PHX-GAMEPLAY-002 - Dynamic Cinematic Modals
status: In Progress
assignee:
  - '@antigravity'
created_date: '2026-06-29 01:40'
updated_date: '2026-06-29 01:40'
labels: []
dependencies: []
ordinal: 173800
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Add cinematic NarrationEvent. NarrationProducer emits cinematic events for Ace vs Ace clashes and lethal damage. CinematicModal component subscribes to NarrationBus and displays full-screen animated splash screens.
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
