---
id: TASK-372
title: SwiftUI real Replay viewer data wiring (replace hardcoded demo match)
status: To Do
assignee: []
created_date: '2026-07-26 15:50'
labels:
  - swiftui
  - app-store-readiness
dependencies: []
references:
  - 'game-swiftui:PhalanxDuelClient/UI/ReplayViewer.swift'
  - 'game-swiftui:PhalanxDuelClient/UI/ServerConnectView.swift'
  - 'game-swiftui:PhalanxDuelClient/UI/NarrationTickerView.swift'
  - 'game-swiftui:PhalanxDuelClient/UI/EngagementLogView.swift'
priority: low
type: bug
ordinal: 239800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
`ReplayViewer` is entirely hardcoded fake data: default `matchId: "demo-replay-001"`, a fixed "P1: Valeryk vs P2: Aegis" label, two hardcoded `Card` literals (Ace of Spades / Queen of Hearts), and a scrubber slider that only changes a displayed turn number and a canned sentence — none of it is backed by any real match. The "Launch Match Replay Viewer" button in ServerConnectView opens this with no real matchId ever passed in.

Every completed match already has a real, authoritative transaction log (`TransactionLogEntry`/`CombatLogEntry`, the same data `NarrationTickerView`/`EngagementLogView` render live during a match) — this needs a way to fetch a past match's log by ID and step through it, not new server-side capability.

Lower priority than TASK-366 through TASK-370. Surfaced during an App-Store-readiness research pass alongside TASK-366 through TASK-371, TASK-373.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 #1 ReplayViewer accepts a real matchId (e.g. from a completed match in match history or Active Matches) and fetches that match's real transaction log instead of using hardcoded cards/labels
- [ ] #2 #2 The scrubber and playback controls step through real turns from that log, reusing NarrationTickerView/EngagementLogView's existing formatting logic where possible instead of inventing new display code
- [ ] #3 #3 'Launch Match Replay Viewer' in ServerConnectView is either given a real match to open or removed until a real match-selection flow exists (it should not open a viewer with no real backing data)
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
