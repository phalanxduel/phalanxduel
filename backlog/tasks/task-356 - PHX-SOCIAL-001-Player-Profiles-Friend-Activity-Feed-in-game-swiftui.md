---
id: TASK-356
title: PHX-SOCIAL-001 - Player Profiles & Friend Activity Feed in game-swiftui
status: Done
assignee: []
created_date: '2026-07-25 00:49'
updated_date: '2026-07-25 00:50'
labels: []
dependencies:
  - TASK-355
priority: medium
ordinal: 221800
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Implement SocialFeedView.swift connecting to GET /api/users/me/social
- [ ] #2 Allow following/unfollowing players directly from LeaderboardView and ProfileView
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
