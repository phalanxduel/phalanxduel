---
id: TASK-115
title: Resolve Empty and Under-specified OpenAPI Schema Components
status: Done
assignee: []
created_date: '2026-03-29 18:12'
updated_date: '2026-03-31 13:51'
labels: []
milestone: v0.5.0 - Stability & Playability
dependencies: []
priority: high
ordinal: 38000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Several component models in the OpenAPI spec are currently empty or under-specified. This makes codegen tools produce 'any' or 'unknown' types, forcing external developers to manually guess the data structures.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Fix toJsonSchema or the registration loop in app.ts so shared components in components.schemas are not empty.
- [ ] #2 Ensure route-level schemas (body/response) are fully populated and correctly reference shared components.
- [ ] #3 Eliminate def-N auto-generated names in favor of canonical names (e.g., GameState, ErrorResponse).
- [ ] #4 Verify via openapi.test.ts that GameState and MatchLog have full property definitions in the spec.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 All AC items are met and verified.
- [ ] #2 OpenAPI snapshot reflects full schema structures (no empty objects for key models).
- [ ] #3 No functional regressions in request validation or response serialization.
<!-- DOD:END -->
