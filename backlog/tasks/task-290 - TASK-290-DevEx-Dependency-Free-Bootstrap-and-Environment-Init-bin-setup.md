---
id: TASK-290
title: 'TASK-290 - DevEx: Dependency-Free Bootstrap and Environment Init (bin/setup)'
status: To Do
assignee: []
created_date: '2026-05-08 02:07'
labels: []
dependencies: []
ordinal: 143000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create a robust bin/setup script that handles Postgres init, pgvector setup, and local seeds for zero-config onboarding.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 bin/setup works on a clean macOS/Linux host
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
