---
id: TASK-353
title: PHX-STORE-003 - Native Leaderboard and Player Profile Dashboard
status: To Do
assignee: []
created_date: '2026-07-25 00:39'
labels: []
dependencies:
  - TASK-352
priority: high
ordinal: 218800
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Implement LeaderboardView.swift connecting to GET /api/ladder
- [ ] #2 Implement ProfileView.swift showing ELO history, win rate, and active cosmetics
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
