---
id: TASK-114
title: Document OpenAPI Security Schemes and Authentication Flow
status: Planned
assignee: []
created_date: '2026-03-29 18:12'
labels: []
milestone: v0.5.0 - Stability & Playability
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
External clients cannot correctly build automated request wrappers (e.g., via openapi-typescript) without knowing that certain routes require Bearer tokens or refresh cookies. Auth flow is currently implicit and needs to be formal in the spec.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Register bearerAuth (JWT) and cookieAuth (phalanx_refresh) in components.securitySchemes of the OpenAPI spec.
- [ ] #2 Add security requirements to all relevant REST routes (/api/auth/*, /api/stats/history, etc.) indicating required auth method.
- [ ] #3 Verify that the generated openapi.test.ts snapshot includes these security definitions.
<!-- AC:END -->
