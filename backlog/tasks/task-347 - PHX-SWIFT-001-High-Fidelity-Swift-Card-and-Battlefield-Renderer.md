---
id: TASK-347
title: PHX-SWIFT-001 - High-Fidelity Swift Card and Battlefield Renderer
status: To Do
assignee: []
created_date: '2026-07-25 00:33'
labels: []
dependencies: []
priority: high
ordinal: 212800
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Render custom Swift cards with suit emblems, rank typography, and corner badges
- [ ] #2 Display interactive 4x12 grid layout matching engine dimensions
- [ ] #3 xcodebuild compiles cleanly for macOS and iOS
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
