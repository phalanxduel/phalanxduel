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

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Automated test script simulates server node failure during an active match.;Match can be resumed by a second server instance without state drift.;WebSocket reconnection logic successfully transitions to the new node.;Latency of recovery is measured and within acceptable limits (< 5s).
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
