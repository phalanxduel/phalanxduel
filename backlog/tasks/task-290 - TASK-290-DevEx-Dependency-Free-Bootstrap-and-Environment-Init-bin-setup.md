---
id: TASK-290
title: 'TASK-290 - DevEx: Dependency-Free Bootstrap and Environment Init (bin/setup)'
status: Done
assignee:
  - '@antigravity'
created_date: '2026-05-08 02:07'
updated_date: '2026-05-08 19:05'
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
- [x] #1 bin/setup works on a clean macOS/Linux host
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Created bin/setup script that automates environment initialization, including .env creation, dependency installation, and database checks. Fixed a quoting bug in bin/qa/bootstrap.zsh discovered during setup verification.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
The new bin/setup script provides a frictionless onboarding experience for developers, automating all initial setup steps.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Code builds without errors (pnpm build)
- [x] #2 Linting and typechecking pass (pnpm lint and pnpm typecheck)
- [x] #3 All unit and integration tests pass (pnpm test:run:all)
- [x] #4 API schemas and types are re-generated and verified (pnpm schema:gen and scripts/ci/verify-schema.sh)
- [x] #5 Documentation artifacts are updated (pnpm docs:artifacts)
- [x] #6 Automated verification scripts pass (FSM consistency and event log coverage)
<!-- DOD:END -->
