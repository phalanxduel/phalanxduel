---
id: TASK-354
title: PHX-MM-001 - Native Rank-Based Matchmaking Queue in game-swiftui
status: Done
assignee: []
created_date: '2026-07-25 00:49'
updated_date: '2026-07-25 00:49'
labels: []
dependencies: []
priority: high
ordinal: 219800
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Implement MatchmakingQueueView.swift connecting to GET /api/matches/lobby and POST /api/matches/queue
- [ ] #2 Display estimated queue wait time, active match counter, and opponent ELO range
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
