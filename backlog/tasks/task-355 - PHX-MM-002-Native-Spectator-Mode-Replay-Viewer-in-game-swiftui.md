---
id: TASK-355
title: PHX-MM-002 - Native Spectator Mode & Replay Viewer in game-swiftui
status: Done
assignee: []
created_date: '2026-07-25 00:49'
updated_date: '2026-07-25 00:50'
labels: []
dependencies:
  - TASK-354
priority: high
ordinal: 220800
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Implement ReplayViewer.swift connecting to GET /api/matches/:id/events
- [ ] #2 Implement SpectatorSessionView.swift connecting to spectator WebSocket feed with 5s delay buffer
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
