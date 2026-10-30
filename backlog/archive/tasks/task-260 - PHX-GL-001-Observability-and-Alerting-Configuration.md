---
id: TASK-260
title: PHX-GL-001 - Observability and Alerting Configuration
status: Done
assignee: []
created_date: '2026-05-02 20:39'
updated_date: '2026-05-06 01:14'
labels: []
milestone: m-10
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Configure actionable alerts and centralized monitoring for critical production failures (stalls, protocol errors, runtime exceptions).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Critical alerts configured in OTel/Datadog for stalling runs and runtime errors.
- [x] #2 Kill switch tested (instant deployment revert successful).
- [x] #3 Log aggregation queries verified for protocol failure rates (REST vs WebSocket).
<!-- AC:END -->

## Definition of Done
--------------------------------------------------
- [x] #1 Code builds without errors (pnpm build)
- [x] #2 Linting and typechecking pass (pnpm lint and pnpm typecheck)
- [x] #3 All unit and integration tests pass (pnpm test:run:all)
- [x] #4 API schemas and types are re-generated and verified (pnpm schema:gen and scripts/ci/verify-schema.sh)
- [x] #5 Documentation artifacts are updated (pnpm docs:artifacts)
- [x] #6 Automated verification scripts pass (FSM consistency and event log coverage)
