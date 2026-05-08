---
id: TASK-285
title: >-
  TASK-285 - Remediation: Standardize Drizzle Migration Parity and Journal
  Synchronization
status: To Do
assignee: []
created_date: '2026-05-08 02:07'
labels: []
dependencies: []
ordinal: 138000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Fix the _journal.json drift and unify the custom migration script with drizzle-kit check to ensure zero-drift schema parity.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 pnpm verify:db passes without manual journal edits
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
