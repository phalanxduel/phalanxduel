---
id: decision-019
title: 'Inlined Route Schemas for Specification Completeness'
owner: Platform
date: '2026-03-29 18:02'
status: accepted
---

# DEC-2E-003 - Inlined Route Schemas for Specification Completeness

## Context
Standard Fastify/Swagger integration often misses detailed response schemas unless explicitly defined at the route level.

## Decision
Route handlers must explicitly define `response` schemas using the `toJsonSchema` utility to ensure they are captured in the OpenAPI specification.

## Consequences
- Guarantees that the generated `docs/json` endpoint provides a complete contract for clients.
- Facilitates the use of client-side code generation tools.
- Improves overall API discoverability and documentation quality.
