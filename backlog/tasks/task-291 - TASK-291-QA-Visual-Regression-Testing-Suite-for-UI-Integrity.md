---
id: TASK-291
title: 'TASK-291 - QA: Visual Regression Testing Suite for UI Integrity'
status: Backlog
assignee: []
created_date: '2026-05-08 02:07'
updated_date: '2026-05-09 08:55'
labels: []
dependencies: []
ordinal: 100
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement Playwright visual comparison tests to protect the pixel-perfect card scaling and tactical glows.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Visual drift > 0.1% fails CI
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
