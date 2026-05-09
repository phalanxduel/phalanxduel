---
id: TASK-225
title: Restore staging service and optimize GHA to skip simulation tests
status: Done
assignee: []
created_date: '2026-04-09 15:40'
updated_date: '2026-04-09 15:50'
labels: []
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The deployment succeeded but the app isn't loading in staging due to missing OTel dependencies in the production image. Additionally, the GitHub Actions (GHAs) are running too many tests and checks, including potentially heavy ones. We need to optimize the GHAs to run only fast linting and unit tests while moving simulation tests to local only.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Staging application loads correctly (no ERR_MODULE_NOT_FOUND).
- [x] #2 GitHub Actions run only lightweight fast linting and tests.
- [x] #3 Simulation tests are only to be run locally.
- [x] #4 GHA runtime is significantly reduced.
<!-- AC:END -->

## Definition of Done
--------------------------------------------------
- [x] #1 Code builds without errors (pnpm build)
- [x] #2 Linting and typechecking pass (pnpm lint and pnpm typecheck)
- [x] #3 All unit and integration tests pass (pnpm test:run:all)
- [x] #4 API schemas and types are re-generated and verified (pnpm schema:gen and scripts/ci/verify-schema.sh)
- [x] #5 Documentation artifacts are updated (pnpm docs:artifacts)
- [x] #6 Automated verification scripts pass (FSM consistency and event log coverage)
