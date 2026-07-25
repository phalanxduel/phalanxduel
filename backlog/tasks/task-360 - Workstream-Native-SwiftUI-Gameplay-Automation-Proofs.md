---
id: TASK-360
title: 'Workstream: Native SwiftUI Gameplay Automation Proofs'
status: In Progress
assignee:
  - Codex
created_date: '2026-07-25 01:14'
updated_date: '2026-07-25 01:23'
labels:
  - swiftui
  - automation
  - playability
dependencies: []
priority: high
type: feature
ordinal: 225800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Establish repeatable, artifact-backed proof that the native SwiftUI client can complete real gameplay and interoperate head-to-head with the browser client against the same authoritative server. The workstream is complete only when both the native bot-game lane and the browser-versus-SwiftUI lane produce inspectable winner and match evidence.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A live SwiftUI client is automatically driven through a complete bot match from connection to game over.
- [ ] #2 A live browser client and a live SwiftUI client are automatically driven as opposing players in the same completed match.
- [ ] #3 Both proof lanes expose one-command repeatable entrypoints and retain structured manifests plus user-visible evidence for successful and failed runs.
- [ ] #4 Operator documentation identifies prerequisites, commands, artifact locations, and how to validate that the evidence came from the same authoritative match.
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

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Complete TASK-360.01 by making the macOS SwiftUI client consume the canonical live WebSocket contract, exposing a real bot-match entrypoint, and driving that visible app to game over with XCUITest evidence.
2. Verify and preserve the native proof artifacts as the prerequisite contract for TASK-360.02.
3. Complete TASK-360.02 by reusing the native driver alongside the existing Playwright action patterns, coordinating both clients into one authoritative PvP match, and correlating their terminal evidence by match ID.
4. Keep engine/server gameplay semantics unchanged; treat the browser client and shared schemas as the authority. Each slice must ship a one-command runner, success manifest, screenshots, and a failure bundle before the workstream advances.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Started 2026-07-24 as the active foundational-proof workstream. Execute TASK-360.01 first; TASK-360.02 remains dependency-blocked until the native bot-game proof is complete.

L2 workstream discovery: the active native app is a separate clean macOS-only `game-swiftui` repository; the main repo remains the authority for shared contracts, server behavior, browser automation, task tracking, and orchestration. The second slice is correctly dependency-blocked on the first because it needs a proven native action/evidence driver.
<!-- SECTION:NOTES:END -->
