---
id: TASK-130
title: Implement RESTful Game Action Endpoint
status: To Do
assignee: []
created_date: '2026-03-30 21:02'
updated_date: '2026-03-30 22:48'
labels: []
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
To support clients that cannot maintain long-lived WebSocket connections (e.g., simple CLI tools, low-power mobile apps), we need a standard RESTful way to submit game turns. This provides a symmetric experience to the WebSocket protocol.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 #1 Implement 'POST /api/matches/:id/action' that accepts a standard Game Action.
- [ ] #2 #2 Ensure the endpoint performs the same identity verification as the WebSocket handler (playerIndex vs socket/identity).
- [ ] #3 #3 Return the 'TurnViewModel' (redacted pre/post state and events) in the response.
- [ ] #4 #4 Document this endpoint in OpenAPI with full schema support for all action types.
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
