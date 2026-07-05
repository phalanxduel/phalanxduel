---
id: TASK-340
title: PHX-UI-007 - Match History Detail View
status: Icebox
assignee: []
created_date: '2026-07-01 21:43'
updated_date: '2026-07-05 16:44'
labels: []
dependencies: []
ordinal: 182800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Dedicated page/modal to review the events of past matches you've played.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Clicking a match in the Player Profile opens a detailed breakdown.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code builds without errors (pnpm build)
- [ ] #2 Linting and typechecking pass (pnpm lint and pnpm typecheck)
- [ ] #3 All unit and integration tests pass (pnpm test:run:all)
- [ ] #4 API schemas and types are re-generated and verified (pnpm schema:gen and scripts/ci/verify-schema.sh)
- [ ] #5 Documentation artifacts are updated (pnpm docs:artifacts)
- [ ] #6 Automated verification scripts pass (FSM consistency and event log coverage)
<!-- DOD:END -->
