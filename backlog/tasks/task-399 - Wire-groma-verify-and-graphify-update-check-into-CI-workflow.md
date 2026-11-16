---
id: TASK-399
title: Wire groma verify and graphify update check into CI workflow
status: Done
assignee: []
created_date: '2026-11-14T22:50:00Z'
labels:
  - architecture
  - groma
  - graphify
dependencies: []
priority: medium
ordinal: 273800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Ensure the 652-element TypeScript/Go C4 architecture model in groma/architecture.json and AST graph stay synchronized with code changes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 groma scan --plain reports zero architectural drift
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
