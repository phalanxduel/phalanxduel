---
id: TASK-119
title: Implement Predictive Simulation Endpoint for Legal Moves
status: Planned
assignee: []
created_date: '2026-03-29 22:15'
labels: []
milestone: m-1
dependencies:
  - TASK-118
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
To support completely decoupled UIs with features like 'Legal Move' highlighting or attack preview calculations, the API must provide a way to 'dry-run' an action. This endpoint takes a proposed action, runs it through the engine, and returns the projected View Model of the result without modifying the actual match state.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Implement POST /api/matches/:id/simulate endpoint.
- [ ] #2 Endpoint accepts an action payload and returns the resulting ViewModel without persisting the change to the database or affecting the actual game state.
- [ ] #3 Endpoint returns structured validation errors if the simulated action is illegal.
- [ ] #4 Document the endpoint in the OpenAPI specification.
<!-- AC:END -->
