---
id: TASK-48
title: OpenAPI Response Schema Enrichment
status: To Do
assignee: []
created_date: '2026-03-17'
updated_date: '2026-03-17'
labels: [api, contract]
dependencies: []
priority: medium
ordinal: 4800
---

## Description

The OpenAPI output at `/docs/json` has empty `components.schemas` and many
routes return only `Default Response`. External clients cannot use codegen
tools against the published surface.

## Problem Scenario

Given a third-party client developer runs codegen against `/docs/json`,
when they inspect the generated types, then they get empty or untyped
response models because schemas are not published.

## Planned Change

1. Add Fastify response schemas (using Zod-to-JSON-Schema) to all public
   REST routes (`/api/defaults`, `/matches`, `/api/stats/*`, `/api/ladder/*`)
2. Register shared schemas in `components.schemas` via Swagger plugin
3. Update `server/tests/openapi.test.ts` snapshot to verify schemas appear
4. Ensure `/docs/json` passes a basic OpenAPI validator

## Verification

- `pnpm --filter @phalanxduel/server test` — all tests pass
- `GET /docs/json` contains non-empty `components.schemas`
- A codegen tool (e.g., `openapi-typescript`) produces typed output

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Task objectives are met as described in the mission.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 **Spec Alignment (DoD §1)**: Implementation matches canonical rules and architectural constraints.
- [ ] #2 **Verification (DoD §2)**: All changes are covered by automated tests and manual verification evidence is recorded.
- [ ] #3 **Trust and Safety (DoD §3)**: The server remains authoritative; no secrets or hidden info leaked.
- [ ] #4 **Code Quality (DoD §4)**: Code follows project conventions, modularity, and naming standards.
- [ ] #5 **Observability (DoD §5)**: Critical paths emit necessary logs and telemetry for operations.
- [ ] #6 **Accessibility (DoD §6)**: Changes are documented and understandable for contributors and users.
- [ ] #7 **AI-Assisted Work (DoD §7)**: AI changes are reviewed by a human and follow AGENTS.md.
<!-- DOD:END -->