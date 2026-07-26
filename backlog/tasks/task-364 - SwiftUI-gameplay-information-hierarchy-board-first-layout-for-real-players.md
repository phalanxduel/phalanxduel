---
id: TASK-364
title: SwiftUI gameplay information hierarchy (board-first layout for real players)
status: To Do
assignee: []
created_date: '2026-07-26 11:31'
labels:
  - swiftui
  - ux
  - polish
dependencies: []
references:
  - 'game-swiftui:PhalanxDuelClient/UI/GameSessionView.swift'
priority: medium
type: enhancement
ordinal: 231800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
`GameSessionView.swift`'s non-automation `List` currently orders sections as: Session Info (Target/API/WebSocket/matchId/Role/Spectators) → Server Snapshot (build version) → Last Error → Tactical Combat Resolution → Narration → a raw "Authoritative GameState" dump (phase/turnNumber/activePlayer/turnOwner/actionCount/specVersion/turnHash/Outcome as literal LabeledContent rows) → Send Pass button → Battlefield (the actual board) → Debug (always expanded).

For a real (non-automation) player, the tactile board — cards, HP bars, hidden opponent hand — is buried behind operator/protocol chrome (connection info, build version, a raw state dump) that only matters for QA. Automation mode ironically has better hierarchy: it pins GameTableView + NarrationTickerView + EngagementLogView above the List via `safeAreaInset`. Real players get the opposite of "key concerns front and foremost."

Surfaced during a UX research pass alongside TASK-362/363 (accessibility) and the game-feel work (haptics/sound/animation) — see those tasks for the related but distinct findings.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 #1 Battlefield (GameTableView) renders first/topmost for real players, matching the perceptual priority automation mode already gives it
- [ ] #2 #2 Session Info, Server Snapshot, and the raw Authoritative GameState dump are moved into a collapsed/secondary location (a disclosure section, or gated behind a toolbar/menu item) rather than sitting ahead of the board
- [ ] #3 #3 Debug (DebugLogView) is not unconditionally expanded in the primary player-facing hierarchy — collapsed by default or moved behind a menu/settings affordance
- [ ] #4 #4 Narration and Engagement Log keep their existing collapsible pattern (already correct) but their position relative to the board is reconsidered so the board still reads as primary
- [ ] #5 #5 bin/qa/swiftui-proof.sh passes end-to-end after the reorder (automation identifiers and pinned automation board unaffected)
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
