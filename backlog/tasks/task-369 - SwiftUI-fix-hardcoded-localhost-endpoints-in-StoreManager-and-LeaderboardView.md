---
id: TASK-369
title: SwiftUI fix hardcoded localhost endpoints in StoreManager and LeaderboardView
status: To Do
assignee: []
created_date: '2026-07-26 15:49'
labels:
  - swiftui
  - app-store-readiness
dependencies: []
references:
  - 'game-swiftui:PhalanxDuelClient/Domain/StoreManager.swift'
  - 'game-swiftui:PhalanxDuelClient/UI/LeaderboardView.swift'
  - 'game-swiftui:PhalanxDuelClient/Networking/Environment.swift'
priority: medium
type: bug
ordinal: 236800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
`StoreManager.loadCatalog`/`syncEntitlementWithServer`/`simulatePurchase` and `LeaderboardView`'s fetch all default to a hardcoded `http://127.0.0.1:3001`, independent of whatever server the player actually configured via `ServerConnectView`'s API Base URL field / `AppEnvironment` presets. These two screens can never work against any real deployed server — only a local dev server on that exact port. Every other network call in the app correctly derives its target from `sessionStore.environment`/`AppEnvironment`.

Surfaced during an App-Store-readiness research pass alongside TASK-366 through TASK-368, TASK-370 through TASK-373.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 #1 StoreManager's server calls (loadCatalog, syncEntitlementWithServer, and whatever replaces simulatePurchase per TASK-368) derive their base URL from the app's configured AppEnvironment instead of a hardcoded default parameter
- [ ] #2 #2 LeaderboardView's ladder fetch does the same
- [ ] #3 #3 Switching environments/presets in ServerConnectView actually changes what server Store and Leaderboard hit
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
