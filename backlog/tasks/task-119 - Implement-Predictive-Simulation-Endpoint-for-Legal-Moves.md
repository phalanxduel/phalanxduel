---
id: TASK-119
title: Implement Predictive Simulation Endpoint for Legal Moves
status: Done
assignee:
  - '@generalist'
created_date: '2026-03-29 22:15'
updated_date: '2026-03-31 13:51'
labels:
  - api
  - simulation
  - ux
milestone: m-1
dependencies:
  - TASK-118
references:
  - /Users/mike/github.com/just3ws/lawnstarter-engineer-assessment
priority: high
ordinal: 33000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
To support completely decoupled UIs with features like 'Legal Move' highlighting or attack preview calculations, the API must provide a way to 'dry-run' an action. This endpoint takes a proposed action, runs it through the engine, and returns the projected View Model of the result without modifying the actual match state.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Implement POST /api/matches/:id/simulate endpoint.
- [x] #2 Endpoint accepts an action payload and returns the resulting ViewModel without persisting the change to the database or affecting the actual game state.
- [x] #3 Endpoint returns structured validation errors if the simulated action is illegal.
- [x] #4 Document the endpoint in the OpenAPI specification.
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
TASK-119 was implemented and verified.

Key achievements:
1. Implemented `POST /matches/:id/simulate` for side-effect free action dry-runs.
2. Refactored authorization logic to enforce participant-only simulation of own moves.
3. Bypassed rigid serialization for complex PhalanxEvent payloads to ensure full event data delivery.
4. Added comprehensive tests in `server/tests/simulate.test.ts`.
5. Updated OpenAPI documentation and recorded DEC-2E-005.
6. Passed full workspace verification (pnpm verify:all).
<!-- SECTION:FINAL_SUMMARY:END -->
