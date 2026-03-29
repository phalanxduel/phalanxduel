---
id: DEC-2E-003
status: locked
owner: Mike Hall
date: 2026-03-29
---
# DEC-2E-003: Inlined Route Schemas for Specification Completeness

To overcome limitations in `fastify-swagger`'s handling of shared `$id` references (which often resulted in empty `components.schemas`), all REST route definitions MUST use expanded JSON schemas via `toJsonSchema(Schema)` instead of `$ref` strings. This ensures the published `/docs/json` artifact is fully self-contained and ready for external client code generation.
