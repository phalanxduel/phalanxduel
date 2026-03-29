---
id: TASK-113
title: Implement AsyncAPI Specification for WebSocket Protocol
status: Planned
assignee:
  - '@generalist'
created_date: '2026-03-29 18:12'
updated_date: '2026-03-29 22:31'
labels:
  - api
  - contract
  - ws
milestone: m-1
dependencies: []
references:
  - /Users/mike/github.com/just3ws/lawnstarter-engineer-assessment
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The core gameplay occurs over WebSockets (/ws), but the current OpenAPI documentation only covers REST endpoints. External developers need a formal specification for the event-driven message protocol to build custom clients.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Create an AsyncAPI specification file (e.g., docs/api/asyncapi.yaml) defining the /ws endpoint.
- [ ] #2 Document ClientMessageSchema and ServerMessageSchema (from @phalanxduel/shared) within AsyncAPI.
- [ ] #3 Define message channels for createMatch, joinMatch, action, and spectator events.
- [ ] #4 Integrate the AsyncAPI document into the server (e.g., available at /docs/asyncapi.json).
<!-- AC:END -->
