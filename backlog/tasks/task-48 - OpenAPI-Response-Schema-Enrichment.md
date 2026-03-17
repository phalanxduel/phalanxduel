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
