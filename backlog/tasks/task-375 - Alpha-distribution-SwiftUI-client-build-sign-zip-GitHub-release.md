---
id: TASK-375
title: 'Alpha distribution: SwiftUI client build/sign/zip + GitHub release'
status: Done
assignee: []
created_date: '2026-07-26 19:55'
updated_date: '2026-07-26 22:36'
labels:
  - release
  - swiftui
  - macos
dependencies:
  - TASK-365
  - TASK-366
references:
  - 'game-swiftui:project.yml'
  - docs/architecture/versioning.md
priority: high
type: chore
ordinal: 242800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Package game-swiftui as a downloadable alpha .app, distinct in scope from TASK-373 (full App Store readiness — notarization, Developer ID signing, App Store Connect). This is local-alpha scope: ad-hoc signed, unnotarized, clearly labeled.

Sequence:
1. Requires TASK-365/TASK-366 uncommitted work committed first (game-feel + account/handoff implementation already built and demo-verified this session, sitting in the working tree).
2. Create public GitHub repo phalanxduel/game-swiftui (currently local-only, no remote at all), push full history.
3. Add bin/archive-app.sh: xcodebuild Release config with ENABLE_DEBUG_DYLIB=NO, ad-hoc codesign (`codesign --force --deep --sign -`), ditto-zip into dist/PhalanxDuelClient-vX.Y.Z-macOS.zip.
4. Set MARKETING_VERSION in project.yml to 0.1.0-alpha.1 so CFBundleShortVersionString matches the release tag (BootView's hardcoded version string was already fixed to read 'alpha.1' this session — worth wiring it to Bundle.main instead of a second hardcoded literal).
5. Tag v0.1.0-alpha.1, gh release create with the zip attached.

Depends on the version-compatibility work already done (SessionStore decodes _meta.versions, surfaces a compatibilityWarning banner in ServerConnectView's Discovery section).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 phalanxduel/game-swiftui exists on GitHub (public) with full history pushed
- [x] #2 bin/archive-app.sh produces a clean, launchable .app zip
- [x] #3 v0.1.0-alpha.1 tag and GitHub release exist with the zip attached
- [x] #4 MARKETING_VERSION and BootView's displayed version agree and are sourced from one place
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
Completed earlier this session (before the duel-cli install-path debugging). phalanxduel/game-swiftui created as a public repo with full history pushed. bin/archive-app.sh rewritten to a real archive/sign/zip pipeline (xcodebuild Release + ENABLE_DEBUG_DYLIB=NO, ad-hoc codesign, ditto zip) and verified end-to-end: extracted the built zip fresh, stripped quarantine the same way the planned Homebrew cask postflight will, confirmed the ad-hoc signature, launched the actual compiled binary (confirmed via process list, not a debug-dylib stub), confirmed clean exit.

MARKETING_VERSION set to 0.1.0-alpha.1 in project.yml; BootView.swift now reads the version from Bundle.main.infoDictionary["CFBundleShortVersionString"] instead of a second hardcoded literal, so the two can't drift.

Tagged v0.1.0-alpha.1 and created the GitHub release with the zip attached, plus a new README covering install (brew cask or manual zip), sign-in flow, and building from source.

Release: https://github.com/phalanxduel/game-swiftui/releases/tag/v0.1.0-alpha.1
<!-- SECTION:FINAL_SUMMARY:END -->
