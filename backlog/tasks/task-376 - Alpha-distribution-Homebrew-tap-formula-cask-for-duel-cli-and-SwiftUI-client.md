---
id: TASK-376
title: >-
  Alpha distribution: Homebrew tap (formula + cask) for duel-cli and SwiftUI
  client
status: Done
assignee: []
created_date: '2026-07-26 19:55'
updated_date: '2026-07-26 22:54'
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
- [x] #1 phalanxduel/homebrew-tap repo exists (public) with Formula/duel-cli.rb and Casks/phalanx-duel-client.rb
- [x] #2 brew install duel-cli works from a clean machine state and the binary runs
- [x] #3 brew install --cask phalanx-duel-client works and the app launches without a manual Gatekeeper right-click bypass (quarantine stripped by postflight)
- [x] #4 cask caveats clearly disclose alpha/unsigned status
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

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
phalanxduel/homebrew-tap created (public) and pushed with:
- `Formula/duel-cli.rb` — builds from the `clients/go/duel-cli/v0.1.1` tagged source tarball via `go build` (standard homebrew-go pattern, no cross-compiled binaries).
- `Casks/phalanx-duel-client.rb` — installs the `v0.1.0-alpha.1` zip from phalanxduel/game-swiftui, `postflight` strips the quarantine attribute via `xattr -cr`, caveats block clearly discloses alpha/ad-hoc-signed/unnotarized status.

Verified for real, not assumed:
- `brew tap phalanxduel/tap` — succeeded (required `brew trust phalanxduel/tap` first, a local Homebrew policy gate).
- `brew install duel-cli` — built from source in ~19s, `duel-cli -h` ran and printed real usage output.
- `brew install --cask phalanx-duel-client` — installed to /Applications; confirmed `com.apple.quarantine` was absent via `xattr -l` (only the benign `com.apple.provenance` remained), confirmed the ad-hoc codesign via `codesign -dv`, launched via `open` and confirmed a real running process via `ps aux` (no Gatekeeper prompt), then quit cleanly.

Also fixed a real, unrelated accuracy bug found while checking the license field for the formula: the main repo's README claimed GPL-3.0-or-later, but LICENSE is actually AGPL-3.0-or-later. Corrected.
<!-- SECTION:FINAL_SUMMARY:END -->
