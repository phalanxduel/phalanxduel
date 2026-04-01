---
id: TASK-129
title: Establish Continuous API Integration Testing Gate
status: Planned
assignee: []
created_date: '2026-03-30 19:54'
updated_date: '2026-04-01 20:23'
labels: []
dependencies: []
priority: medium
ordinal: 38000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Transition API testing from a manual 'smoke test' to a continuous verification gate. This ensures that changes to the server (like middleware or database logic) never break the core game loop.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 #1 Add a --continuous or --until-failure flag to bin/qa/api-playthrough.ts.
- [ ] #2 #2 Configure a CI job (GitHub Action) that runs 100 random games against a spawned dev server on every PR.
- [ ] #3 #3 Ensure logs and traces are archived as artifacts on failure.
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
