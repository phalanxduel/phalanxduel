---
id: TASK-283
title: 'Release: Final Security & Environment Seal (GHA Pinning, Secret Rotation)'
status: Done
assignee: []
created_date: '2026-05-07 15:06'
updated_date: '2026-05-07 16:51'
labels: []
dependencies:
  - TASK-92
  - TASK-282
priority: high
ordinal: 136000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Execute the final 'Seal' phase of production readiness. Pin all GitHub Actions to immutable SHAs, rotate staging/production credentials, and finalize the environment contracts for v1.2.0 release.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria:
--------------------------------------------------
- [x] #1 All GitHub Action steps are pinned to full commit SHAs.
- [x] #2 Secret rotation script successfully updates Fly.io and GitHub environments.
- [x] #3 Environment contract (docs/configuration.md) matches live infrastructure.
- [x] #4 GHA audit workflow passes with 100% SHA coverage.

Definition of Done:
--------------------------------------------------
- [x] #1 Code builds without errors (pnpm build)
- [x] #2 Linting and typechecking pass (pnpm lint and pnpm typecheck)
- [x] #3 All unit and integration tests pass (pnpm test:run:all)
- [x] #4 API schemas and types are re-generated and verified (pnpm schema:gen and scripts/ci/verify-schema.sh)
- [x] #5 Documentation artifacts are updated (pnpm docs:artifacts)
- [x] #6 Automated verification scripts pass (FSM consistency and event log coverage)
<!-- DOD:END -->
