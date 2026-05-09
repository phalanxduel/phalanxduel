---
id: TASK-264
title: PHX-GL-008 - Implement Poison Pill Recovery
status: Done
assignee: []
created_date: '2026-05-02 20:44'
updated_date: '2026-05-03 00:40'
labels: []
milestone: m-10
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement a reliable way to forcibly terminate matches that have entered an unrecoverable state (poison pill) without requiring manual database intervention.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Develop a 'terminateMatch' API/script to forcibly end matches in unrecoverable states.
- [x] #2 Ensure the system handles match termination without crashing the serialization thread.
<!-- AC:END -->

## Definition of Done
--------------------------------------------------
- [x] #1 Code builds without errors (pnpm build)
- [x] #2 Linting and typechecking pass (pnpm lint and pnpm typecheck)
- [x] #3 All unit and integration tests pass (pnpm test:run:all)
- [x] #4 API schemas and types are re-generated and verified (pnpm schema:gen and scripts/ci/verify-schema.sh)
- [x] #5 Documentation artifacts are updated (pnpm docs:artifacts)
- [x] #6 Automated verification scripts pass (FSM consistency and event log coverage)
