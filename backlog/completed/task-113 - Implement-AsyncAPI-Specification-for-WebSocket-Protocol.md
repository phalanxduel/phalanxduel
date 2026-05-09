---
id: TASK-113
title: Implement AsyncAPI Specification for WebSocket Protocol
status: Done
assignee:
  - '@generalist'
created_date: '2026-03-29 18:12'
updated_date: '2026-03-31 13:51'
labels:
  - api
  - contract
  - ws
milestone: m-1
dependencies: []
references:
  - /Users/mike/github.com/just3ws/lawnstarter-engineer-assessment
priority: high
ordinal: 36000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The core gameplay occurs over WebSockets (/ws), but the current OpenAPI documentation only covers REST endpoints. External developers need a formal specification for the event-driven message protocol to build custom clients.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Create an AsyncAPI specification file (e.g., docs/api/asyncapi.yaml) defining the /ws endpoint.
- [x] #2 Document ClientMessageSchema and ServerMessageSchema (from @phalanxduel/shared) within AsyncAPI.
- [x] #3 Define message channels for createMatch, joinMatch, action, and spectator events.
- [x] #4 Integrate the AsyncAPI document into the server (e.g., available at /docs/asyncapi.yaml).
<!-- AC:END -->

## Definition of Done
--------------------------------------------------
- [x] #1 Code builds without errors (pnpm build)
- [x] #2 Linting and typechecking pass (pnpm lint and pnpm typecheck)
- [x] #3 All unit and integration tests pass (pnpm test:run:all)
- [x] #4 API schemas and types are re-generated and verified (pnpm schema:gen and scripts/ci/verify-schema.sh)
- [x] #5 Documentation artifacts are updated (pnpm docs:artifacts)
- [x] #6 Automated verification scripts pass (FSM consistency and event log coverage)
