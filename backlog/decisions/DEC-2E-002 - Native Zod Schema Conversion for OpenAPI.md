---
id: DEC-2E-002
status: locked
owner: Mike Hall
date: 2026-03-29
---
# DEC-2E-002: Native Zod Schema Conversion for OpenAPI

Standardize on Zod 4's native `.toJSONSchema()` method for generating OpenAPI documentation. External libraries like `zod-to-json-schema` and `zod-to-openapi` were found to be incompatible with the current project's Zod version and recursion patterns. The `toJsonSchema` utility in `server/src/utils/openapi.ts` must use the native Zod method to ensure stability and completeness.
