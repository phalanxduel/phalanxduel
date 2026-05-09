---
id: TASK-282
title: >-
  Production: Failover & Recovery Simulation (Distributed Persistence
  Verification)
status: Done
assignee: []
created_date: '2026-05-07 15:05'
updated_date: '2026-05-07 16:46'
labels: []
dependencies: []
priority: high
ordinal: 135000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Validate that match state and session recovery survive a complete server node failure by simulating process termination and verifying that another node can resume the match using the Neon-backed mapping.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria:
--------------------------------------------------
- [x] #1 Automated test script simulates server node failure during an active match.
- [x] #2 Match can be resumed by a second server instance without state drift.
- [x] #3 WebSocket reconnection logic successfully transitions to the new node.
- [x] #4 Latency of recovery is measured and within acceptable limits (< 5s).

Definition of Done:
--------------------------------------------------
- [x] #1 Code builds without errors (pnpm build)
- [x] #2 Linting and typechecking pass (pnpm lint and pnpm typecheck)
- [x] #3 All unit and integration tests pass (pnpm test:run:all)
- [x] #4 API schemas and types are re-generated and verified (pnpm schema:gen and scripts/ci/verify-schema.sh)
- [x] #5 Documentation artifacts are updated (pnpm docs:artifacts)
- [x] #6 Automated verification scripts pass (FSM consistency and event log coverage)
<!-- DOD:END -->
