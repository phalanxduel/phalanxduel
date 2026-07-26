---
id: TASK-376
title: >-
  Alpha distribution: Homebrew tap (formula + cask) for duel-cli and SwiftUI
  client
status: To Do
assignee: []
created_date: '2026-07-26 19:55'
labels:
  - release
  - homebrew
dependencies:
  - TASK-374
  - TASK-375
priority: high
type: chore
ordinal: 243800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Stand up phalanxduel/homebrew-tap (public) with:
- Formula/duel-cli.rb: builds from the GitHub release source tarball via `go build` inside clients/go/duel-cli (standard homebrew-go pattern — no separate cross-compiled binaries needed).
- Casks/phalanx-duel-client.rb: installs the pre-zipped .app from the game-swiftui release, with a `postflight` block running `xattr -cr` on the installed app since it's ad-hoc signed and unnotarized (alpha scope, not App Store — see TASK-373 for that). Caveats block must clearly say this is an unsigned alpha build.

Verify end-to-end: `brew tap phalanxduel/tap`, `brew install duel-cli`, `brew install --cask phalanx-duel-client`, launch both and confirm they actually run (not just that the formula/cask lints clean).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 phalanxduel/homebrew-tap repo exists (public) with Formula/duel-cli.rb and Casks/phalanx-duel-client.rb
- [ ] #2 brew install duel-cli works from a clean machine state and the binary runs
- [ ] #3 brew install --cask phalanx-duel-client works and the app launches without a manual Gatekeeper right-click bypass (quarantine stripped by postflight)
- [ ] #4 cask caveats clearly disclose alpha/unsigned status
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
