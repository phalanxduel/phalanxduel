---
id: TASK-229
title: 'Update engine tests to support restricted system:init action type'
status: Completed
assignee:
  - Gemini CLI
created_date: '2026-04-12 17:09'
labels: []
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update all engine unit tests in engine/tests/ to pass { allowSystemInit: true } when calling applyAction or validateAction with a 'system:init' action type. This is required because I narrowed the engine to reject system:init by default unless explicitly allowed.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria:
--------------------------------------------------
- [x] #1 All engine unit tests listed pass { allowSystemInit: true } when calling applyAction or validateAction with 'system:init' action.
- [x] #2 Tests pass without errors.
- [x] #3 ApplyActionOptions is imported if required.

Definition of Done:
--------------------------------------------------
- [x] #1 Code builds without errors (pnpm build)
- [x] #2 Linting and typechecking pass (pnpm lint and pnpm typecheck)
- [x] #3 All unit and integration tests pass (pnpm test:run:all)
- [x] #4 API schemas and types are re-generated and verified (pnpm schema:gen and scripts/ci/verify-schema.sh)
- [x] #5 Documentation artifacts are updated (pnpm docs:artifacts)
- [x] #6 Automated verification scripts pass (FSM consistency and event log coverage)
