---
id: TASK-367
title: SwiftUI real matchmaking queue wiring (replace decorative radar screen)
status: To Do
assignee: []
created_date: '2026-07-26 15:49'
labels:
  - swiftui
  - app-store-readiness
dependencies: []
references:
  - 'game-swiftui:PhalanxDuelClient/UI/MatchmakingQueueView.swift'
  - 'game-swiftui:PhalanxDuelClient/Domain/Messages.swift'
  - 'game-swiftui:PhalanxDuelClient/GameState/SessionStore.swift'
  - server/src/routes/matchmaking.ts
priority: high
type: bug
ordinal: 234800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
`MatchmakingQueueView` — opened from the primary "Find Ranked 1v1 Match" button on the home screen — is entirely decorative: a rotating radar-sweep graphic, a local `Timer` counting elapsed seconds, and a fake widening ELO-range string computed from a local formula (`(elapsedSeconds / 10) * 25`). It takes `sessionStore` as a parameter but never calls anything on it. It never sends `joinQueue`, never listens for `queueJoined`/`queueMatchFound`, and never transitions to `GameSessionView`. A player tapping the app's main "play ranked" CTA today watches a spinner that runs forever and does nothing.

The wire protocol already defines `joinQueue`/`leaveQueue` (client→server) and `queueJoined`/`queueLeft`/`queueMatchFound` (server→client) in `Messages.swift`, confirmed unused anywhere outside that schema file. `server/src/routes/matchmaking.ts` is a real, substantial (605-line) implementation — this is client-only wiring work, not a backend build.

Surfaced during an App-Store-readiness research pass alongside TASK-366, TASK-368 through TASK-373.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 #1 MatchmakingQueueView sends a real joinQueue action through sessionStore on appear and leaveQueue on cancel/dismiss
- [ ] #2 #2 The displayed elapsed time and status reflect real queueJoined state (not a locally-invented ELO range formula)
- [ ] #3 #3 On receiving queueMatchFound, the view dismisses and the app transitions into a real GameSessionView for the matched game, the same way connectAndCreateBotMatch/connectAndJoinMatch already do
- [ ] #4 #4 Losing connection or a server-side queue error is surfaced to the player rather than leaving the radar animation spinning silently
- [ ] #5 #5 bin/qa/swiftui-proof.sh continues to pass unaffected (it uses bot-match creation, not the queue path)
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
