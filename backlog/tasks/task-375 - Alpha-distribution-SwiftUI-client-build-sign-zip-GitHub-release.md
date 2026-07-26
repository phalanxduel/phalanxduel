---
id: TASK-375
title: 'Alpha distribution: SwiftUI client build/sign/zip + GitHub release'
status: To Do
assignee: []
created_date: '2026-07-26 19:55'
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
- [ ] #1 phalanxduel/game-swiftui exists on GitHub (public) with full history pushed
- [ ] #2 bin/archive-app.sh produces a clean, launchable .app zip
- [ ] #3 v0.1.0-alpha.1 tag and GitHub release exist with the zip attached
- [ ] #4 MARKETING_VERSION and BootView's displayed version agree and are sourced from one place
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
