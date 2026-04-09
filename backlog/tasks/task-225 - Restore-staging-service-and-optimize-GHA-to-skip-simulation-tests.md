---
id: TASK-225
title: Restore staging service and optimize GHA to skip simulation tests
status: In Progress
assignee: []
created_date: '2026-04-09 15:40'
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
- [ ] #1 Staging application loads correctly (no ERR_MODULE_NOT_FOUND).
- [ ] #2 GitHub Actions run only lightweight fast linting and tests.
- [ ] #3 Simulation tests are only to be run locally.
- [ ] #4 GHA runtime is significantly reduced.
<!-- AC:END -->
