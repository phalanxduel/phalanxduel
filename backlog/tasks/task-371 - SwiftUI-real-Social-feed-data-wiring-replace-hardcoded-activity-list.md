---
id: TASK-371
title: SwiftUI real Social feed data wiring (replace hardcoded activity list)
status: To Do
assignee: []
created_date: '2026-07-26 15:50'
labels:
  - swiftui
  - app-store-readiness
dependencies:
  - TASK-366
references:
  - 'game-swiftui:PhalanxDuelClient/UI/SocialFeedView.swift'
  - server/src/routes/social.ts
priority: low
type: bug
ordinal: 238800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
`SocialFeedView` initializes `activities` as a hardcoded `@State` array of four fake rows (Valeryk, PhalanxMaster, CyberSpade, IronShield) and never makes a single network call — the "+ Follow" button only toggles local state. `server/src/routes/social.ts` is a real, JWT-authenticated implementation (comments, moderation/content-filter integration) — this is client-only wiring work.

Lower priority than TASK-366 through TASK-370: social feed is the least essential piece of the meta-game shell for a functioning release, but shipping a fabricated activity feed with invented player names is still misleading and should not go out as-is.

Surfaced during an App-Store-readiness research pass alongside TASK-366 through TASK-370, TASK-372, TASK-373.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 #1 SocialFeedView fetches a real activity feed from the server instead of a hardcoded array
- [ ] #2 #2 Follow/unfollow actually calls the server and persists, rather than only toggling local @State
- [ ] #3 #3 An empty feed (new account, no friends yet) is handled with a real empty state, not fake placeholder rows
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
