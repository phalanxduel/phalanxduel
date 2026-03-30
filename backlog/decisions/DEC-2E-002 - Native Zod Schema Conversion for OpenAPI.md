---
id: DEC-2E-002
title: Native Zod Schema Conversion for OpenAPI
date: '2026-03-29 18:02'
status: accepted
---

## Context
The server needs to generate valid OpenAPI documentation for its routes, many of which use Zod for validation.

## Decision
Standardize on Zod 4's native `.toJSONSchema()` method for generating OpenAPI documentation. External libraries like `zod-to-json-schema` and `zod-to-openapi` were found to be incompatible with the current project's Zod version and recursion patterns.

## Consequences
- The `toJsonSchema` utility in `server/src/utils/openapi.ts` MUST use the native Zod method.
- Ensures stability and completeness of the generated documentation.
- Avoids external dependencies for schema transformation.
