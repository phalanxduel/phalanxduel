---
id: TASK-114
title: Document OpenAPI Security Schemes and Authentication Flow
status: Done
assignee: []
created_date: '2026-03-29 18:12'
updated_date: '2026-03-29 21:41'
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
- [ ] #2 Apply security requirements to routes: /api/auth/me, /api/auth/profile, /api/auth/gamertag, /api/auth/logout, and /api/stats/:userId/history.
- [ ] #3 Verify via openapi.test.ts that securitySchemes are present and routes have security arrays.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 All AC items are met and verified.
- [ ] #2 No linting or type-checking errors introduced.
- [ ] #3 OpenAPI snapshot includes the security definitions.
<!-- DOD:END -->
