---
id: TASK-352
title: PHX-STORE-002 - StoreKit 2 In-App Purchase Integration in game-swiftui
status: Done
assignee: []
created_date: '2026-07-25 00:39'
updated_date: '2026-07-25 00:47'
labels: []
dependencies:
  - TASK-351
priority: high
ordinal: 217800
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Implement StoreManager.swift using StoreKit 2 Product and Transaction APIs
- [ ] #2 Add native StoreView for purchasing Supporter Passes and card backs
- [ ] #3 Sync entitlement receipts with server purchase verification
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
