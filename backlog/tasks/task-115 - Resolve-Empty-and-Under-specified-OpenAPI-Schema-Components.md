---
id: TASK-115
title: Resolve Empty and Under-specified OpenAPI Schema Components
status: Planned
assignee: []
created_date: '2026-03-29 18:12'
labels: []
milestone: v0.5.0 - Stability & Playability
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Several component models in the OpenAPI spec are currently empty or under-specified. This makes codegen tools produce 'any' or 'unknown' types, forcing external developers to manually guess the data structures.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Verify ErrorResponse, GameState, MatchLog, and TurnResult are fully populated in components.schemas via toJsonSchema.
- [ ] #2 Update registerAuthRoutes so responses like /api/auth/login point to the fully-typed AuthResponseSchema instead of empty objects.
- [ ] #3 Verify that the OpenAPI snapshot contains no untyped 'additionalProperties: true' or empty objects for key models.
<!-- AC:END -->
