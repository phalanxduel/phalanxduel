---
id: TASK-359
title: PHX-STORE-006 - Stripe Checkout and Webhook Integration for Web Client
status: In Progress
assignee: []
created_date: '2026-07-25 01:03'
labels: []
dependencies: []
priority: high
ordinal: 224800
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Add POST /api/store/create-checkout-session and POST /api/store/stripe-webhook to server
- [ ] #2 Add Stripe cosmetic store modal to web client
- [ ] #3 Verify pnpm verify:quick passes
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
