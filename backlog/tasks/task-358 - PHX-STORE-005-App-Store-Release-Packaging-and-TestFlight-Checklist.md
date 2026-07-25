---
id: TASK-358
title: PHX-STORE-005 - App Store Release Packaging and TestFlight Checklist
status: Done
assignee: []
created_date: '2026-07-25 00:56'
updated_date: '2026-07-25 00:57'
labels: []
dependencies:
  - TASK-357
priority: high
ordinal: 223800
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Create docs/app_store_release_checklist.md covering App Store Connect setup, Privacy Manifest verification, and TestFlight deployment
- [ ] #2 Verify bin/archive-app.sh produces clean app bundle
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
