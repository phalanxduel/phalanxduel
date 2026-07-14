---
id: TASK-345.07
title: Build Unified Production Assurance Suite
status: To Do
assignee: []
created_date: '2026-07-14 00:17'
updated_date: '2026-07-14 00:17'
labels:
  - production
  - qa
  - operations
dependencies:
  - TASK-345.02
  - TASK-345.03
  - TASK-345.01
  - TASK-345.05
  - TASK-345.06
documentation:
  - docs/ops/runbook.md
  - bin/qa/
parent_task_id: TASK-345
priority: high
ordinal: 206800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create a non-destructive-by-default production audit that evaluates every required subsystem with PASS, DEGRADED, FAIL, or NOT_TESTED semantics. Add an explicitly enabled synthetic mode for controlled production gameplay, reconnect, replay, spectator, admin, MCP, and email verification without exposing secrets or polluting player data.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Default audit performs no production mutations and checks every required read-only surface
- [ ] #2 Synthetic mode requires explicit operator enablement and marks generated data as automated
- [ ] #3 Audit verifies TLS, assets, REST, WebSocket, persistence, release SHA, Fly processes, observability, admin, MCP, and email
- [ ] #4 Synthetic gameplay verifies completion, event log, fingerprint, reconnect, replay, and spectator behavior
- [ ] #5 Audit output is machine-readable and returns nonzero for required FAIL or NOT_TESTED states
- [ ] #6 Secrets and private player data never appear in audit output
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
