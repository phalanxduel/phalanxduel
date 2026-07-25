---
id: TASK-350
title: PHX-SWIFT-004 - TestFlight and App Store Deployment Packaging
status: To Do
assignee: []
created_date: '2026-07-25 00:33'
labels: []
dependencies:
  - TASK-349
priority: high
ordinal: 215800
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Add AppIcon asset catalogs, launch screen generation, and AppStore.xcconfig
- [ ] #2 Configure PrivacyInfo.xcprivacy manifest
- [ ] #3 xcodebuild archive creates valid .xcarchive bundle
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
