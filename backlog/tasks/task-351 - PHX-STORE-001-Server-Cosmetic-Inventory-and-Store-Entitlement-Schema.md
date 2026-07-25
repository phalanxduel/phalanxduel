---
id: TASK-351
title: PHX-STORE-001 - Server Cosmetic Inventory and Store Entitlement Schema
status: Done
assignee: []
created_date: '2026-07-25 00:38'
updated_date: '2026-07-25 00:45'
labels: []
dependencies:
  - TASK-350
priority: high
ordinal: 216800
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Add cosmetics database table and Drizzle schema
- [ ] #2 Expose GET /api/store/products and POST /api/store/verify-purchase endpoints
- [ ] #3 Server tests under with-test-postgres.sh pass cleanly
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
