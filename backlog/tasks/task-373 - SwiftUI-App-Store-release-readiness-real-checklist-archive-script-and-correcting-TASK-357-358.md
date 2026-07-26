---
id: TASK-373
title: >-
  SwiftUI App Store release readiness: real checklist, archive script, and
  correcting TASK-357/358
status: To Do
assignee: []
created_date: '2026-07-26 15:50'
labels:
  - swiftui
  - app-store-readiness
dependencies:
  - TASK-366
  - TASK-367
  - TASK-368
  - TASK-369
  - TASK-370
references:
  - >-
    backlog/tasks/task-357 -
    PHX-STORE-004-StoreKit-2-Local-Test-Configuration-in-game-swiftui.md
  - >-
    backlog/tasks/task-358 -
    PHX-STORE-005-App-Store-Release-Packaging-and-TestFlight-Checklist.md
  - 'game-swiftui:PhalanxDuelClient/UI/BootView.swift'
priority: medium
type: chore
ordinal: 240800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
TASK-357 ("StoreKit 2 Local Test Configuration") and TASK-358 ("App Store Release Packaging and TestFlight Checklist") are both marked Done in Backlog, but every acceptance-criteria and Definition-of-Done checkbox on both is unchecked, and neither has implementation notes or a final summary.

Verified what actually exists vs. what TASK-358 claims:
- `docs/app_store_release_checklist.md` — does not exist.
- `bin/archive-app.sh` — does not exist.
- `PhalanxDuelClient/PhalanxStore.storekit` — exists and is real (a proper local StoreKit test catalog).
- `project.yml`'s `storeKitConfiguration: PhalanxDuelClient/PhalanxStore.storekit` — wired into the Xcode scheme correctly.

So TASK-357's core technical deliverable (the `.storekit` config + scheme wiring) is real and mostly done, just never checked off or noted. TASK-358's deliverables (the checklist doc and archive script) were not done at all despite being marked Done.

Also noticed in passing: `BootView.swift` displays "NATIVE iOS CLIENT v0.1.0" on the macOS build — stale/wrong-platform copy.

This task is the wrap-up/correction step for TASK-366 through TASK-372 — it should not be started until those land, since a real release checklist needs to reflect an app that actually has working auth, matchmaking, purchases, and non-fake meta screens.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 #1 TASK-357 and TASK-358 are corrected in Backlog: either their checkboxes are retroactively marked to match reality (357's storekit/scheme AC checked; 358's checklist/archive-script AC left unchecked with a note explaining the gap) or they are reopened
- [ ] #2 #2 docs/app_store_release_checklist.md is actually created, covering App Store Connect setup, Privacy Manifest verification, and TestFlight deployment as TASK-358 originally specified
- [ ] #3 #3 bin/archive-app.sh exists and is verified to produce a clean app bundle
- [ ] #4 #4 BootView's platform label is corrected (it currently reads 'NATIVE iOS CLIENT' on a macOS-only app)
- [ ] #5 #5 The checklist explicitly confirms TASK-366 through TASK-372 (account/auth, matchmaking, real purchases, endpoint config, profile/social/replay data) are complete before recommending submission — this task should not itself paper over those gaps
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
