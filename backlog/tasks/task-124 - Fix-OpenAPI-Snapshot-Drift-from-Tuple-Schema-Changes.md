---
id: TASK-124
title: Fix OpenAPI Snapshot Drift from Tuple Schema Changes
status: Done
assignee: []
created_date: '2026-03-30 14:55'
updated_date: '2026-03-30 14:59'
labels:
  - bug
dependencies: []
priority: high
milestone: 'Decoupled gameplay via API automation'
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
During the execution of `TASK-116` (Documenting Game Logic API Specs), multiple enhancements were made to the shared HTTP API schemas, transforming string schemas to enums, capping sizes on arrays, and adding explicit metadata annotations for the exported OpenAPI documentation.

Because `server/tests/openapi.test.ts` uses Jest/Vitest snapshots (`toMatchSnapshot()`) to catch regressions in the generated API payload, the test is now failing because the exported `openapi.json` accurately reflects these *intended* rule additions.

To resolve this, the development snapshot needs an explicit update using `pnpm exec vitest run -u tests/openapi.test.ts` or by manually aligning the validation definitions so the CI pipeline turns green.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Tests in tests/openapi.test.ts pass
- [x] #2 Snapshot is updated to reflect the new strict Zod definitions added in TASK-116
<!-- AC:END -->
