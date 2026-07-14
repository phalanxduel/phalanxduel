---
id: TASK-345.03
title: Make Production Health and Assurance Signals Truthful
status: To Do
assignee: []
created_date: '2026-07-14 00:17'
updated_date: '2026-07-14 00:17'
labels:
  - production
  - observability
  - server
  - reliability
dependencies:
  - TASK-345.04
  - TASK-345.02
documentation:
  - server/src/routes/health.ts
  - docs/ops/runbook.md
parent_task_id: TASK-345
priority: high
ordinal: 202800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Separate liveness, gameplay readiness, and dependency assurance. Eliminate the false-positive OTel signal that reports active solely from environment configuration, and ensure production cannot silently claim database health when the database client is absent. Provide bounded, machine-readable dependency status suitable for release verification and alerts.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Liveness reports process health without conflating dependency health
- [ ] #2 Readiness verifies the production database client exists and a bounded connectivity check succeeds
- [ ] #3 Observability status distinguishes configured, reachable, degraded, and disabled states
- [ ] #4 Configured-but-unreachable OTel and absent-production-database cases have regression tests
- [ ] #5 Dependency status exposes no secrets or sensitive connection details
- [ ] #6 Fly health checks remain fast and core gameplay is not made unavailable solely by telemetry degradation
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
