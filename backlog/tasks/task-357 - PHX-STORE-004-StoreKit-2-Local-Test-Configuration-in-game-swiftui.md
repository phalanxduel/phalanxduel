---
id: TASK-357
title: PHX-STORE-004 - StoreKit 2 Local Test Configuration in game-swiftui
status: Done
assignee: []
created_date: '2026-07-25 00:56'
updated_date: '2026-07-25 00:56'
labels: []
dependencies: []
priority: high
ordinal: 222800
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Create PhalanxStore.storekit local test configuration with subscription and cosmetic products
- [ ] #2 Wire StoreKit configuration into project.yml scheme for local Xcode StoreKit testing
- [ ] #3 xcodebuild compiles and passes scheme verification
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
