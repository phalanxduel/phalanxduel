---
id: TASK-123
title: Fastify AJV Tuple Schema Strict Mode Crash
status: Done
assignee: []
created_date: '2026-03-30 14:54'
updated_date: '2026-03-31 13:51'
labels:
  - bug
milestone: Decoupled gameplay via API automation
dependencies: []
priority: high
ordinal: 31000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
During the execution of `TASK-116` (Documenting Game Logic API Specs), stricter schemas were introduced to `shared/src/schema.ts`, including replacing an untyped pass array with an explicit dual-number tuple (`z.tuple([z.number(), z.number()])`) for tracking `consecutivePasses` and `totalPasses`.

When Fastify mounts the `/matches/:id/simulate` endpoint, it attempts to compile the underlying Zod-to-JSON-Schema definitions using `ajv` in strict mode. AJV rejects the newly yielded tuple schema because it creates an `items: [{type: "number"}, {type: "number"}]` definition without properly including `minItems` or `maxItems`/`additionalItems`, throwing an error during route compilation:
\`\`\`
strict mode: "items" is 2-tuple, but minItems or maxItems/additionalItems are not specified or different at path "#/properties/preState/properties/passState/properties/consecutivePasses"
\`\`\`
This causes the route controller execution to fail and results in an unhandled HTTP `500 Internal Server Error`, breaking the `tests/simulate.test.ts` suite.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Tests in tests/simulate.test.ts pass
- [x] #2 AJV strict mode no longer crashes on tuple definitions
<!-- AC:END -->
