---
id: TASK-131
title: Implement RESTful Match Discovery and Joining
status: To Do
assignee: []
created_date: '2026-03-30 21:03'
updated_date: '2026-03-30 22:48'
labels: []
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
For a Go or mobile client to play head-to-head, they must first find an opponent. This task provides the REST endpoints for match listing and joining, allowing the WebSocket connection to be purely for real-time state updates rather than initial orchestration.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 #1 Implement 'GET /api/matches/lobby' to list all publicly joinable matches (non-full, non-private).
- [ ] #2 #2 Implement 'POST /api/matches/:id/join' as a REST alternative to the initial WebSocket join message.
- [ ] #3 #3 Return a 'JoinResponse' containing the unique playerId and its role (P0/P1).
- [ ] #4 #4 Ensure these endpoints are fully documented in OpenAPI for external client discovery.
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
