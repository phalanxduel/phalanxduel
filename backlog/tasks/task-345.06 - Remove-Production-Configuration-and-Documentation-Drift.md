---
id: TASK-345.06
title: Remove Production Configuration and Documentation Drift
status: To Do
assignee: []
created_date: '2026-07-14 00:17'
updated_date: '2026-07-14 00:17'
labels:
  - production
  - documentation
  - configuration
dependencies:
  - TASK-345.04
  - TASK-345.02
  - TASK-345.01
  - TASK-345.05
documentation:
  - server/src/app.ts
  - docs/deployment.md
  - docs/ops/runbook.md
  - docs/ops/deployment-checklist.md
parent_task_id: TASK-345
priority: high
ordinal: 205800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Align repository, OpenAPI, deployment configuration, operator skills, site, and wiki with the production-only immutable-image model. Correct invalid endpoints, remove retired staging behavior, and remove legacy Sentry configuration after verifying no supported runtime consumes it.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 OpenAPI advertises only valid local and production server URLs
- [ ] #2 Active docs and operator skills contain no staging prerequisites or active staging commands
- [ ] #3 Deployment documentation matches tested GHCR image promotion
- [ ] #4 Legacy Sentry runtime secrets and references are removed after a repository-wide consumer audit
- [ ] #5 Architecture documentation contains no contradictory scaling or topology claims
- [ ] #6 Game, site, and wiki pass stale-reference and link validation
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
