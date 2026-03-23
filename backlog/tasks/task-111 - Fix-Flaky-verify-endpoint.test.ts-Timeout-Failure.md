---
id: TASK-111
title: Fix Flaky verify-endpoint.test.ts Timeout Failure
status: To Do
assignee: []
created_date: '2026-03-23 04:18'
updated_date: '2026-03-23 04:19'
labels: []
milestone: v0.5.0 - Stability & Playability
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The test "returns valid verification for an active in-memory match" in `server/tests/verify-endpoint.test.ts` frequently fails due to timeouts (5000ms). This may be related to WebSocket handshake delays or lifecycle management issues between supertest and manual ws connections.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Diagnose and fix the 5000ms timeout in `server/tests/verify-endpoint.test.ts`.
- [ ] #2 Ensure WebSocket-based tests in the server suite are reliable across CI and local environments.
- [ ] #3 Verify that `rtk pnpm test` in the server package passes consistently (5+ consecutive runs).
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Verification matches risk (pnpm verify:all for cross-package or CI-impacting changes)
- [ ] #2 Verification evidence recorded in task or PR with actual commands and results
- [ ] #3 AI-assisted changes move to Human Review status before Done
<!-- DOD:END -->
