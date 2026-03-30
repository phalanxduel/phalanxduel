---
id: TASK-125
title: Unify Scenario Orchestration across Headless and API Runners
status: To Do
assignee: []
created_date: '2026-03-30 19:45'
updated_date: '2026-03-30 22:45'
labels: []
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Currently, headless simulations and API playthroughs use slightly different logic for driving bot actions. This task unifies them under a single 'Scenario' format so a single JSON file can verify both the engine and the live API.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 #1 Create a shared 'Scenario' schema that includes starting seeds, player configurations, and expected action sequences.
- [ ] #2 #2 Refactor bin/qa/simulate-headless.ts to accept a scenario file as input.
- [ ] #3 #3 Refactor bin/qa/api-playthrough.ts to accept the same scenario file.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code builds without errors (pnpm build)
- [ ] #2 Linting and typechecking pass (pnpm lint and pnpm typecheck)
- [ ] #3 All unit and integration tests pass (pnpm test:run:all)
- [ ] #4 API schemas and types are re-generated and verified (pnpm schema:gen and scripts/ci/verify-schema.sh)
- [ ] #5 Documentation artifacts are updated (pnpm docs:artifacts)
- [ ] #6 Automated verification scripts pass (FSM consistency and event log coverage)
- [ ] #7 Code builds without errors (pnpm build)
- [ ] #8 Linting and typechecking pass (pnpm lint and pnpm typecheck)
- [ ] #9 All unit and integration tests pass (pnpm test:run:all)
- [ ] #10 API schemas and types are re-generated and verified (pnpm schema:gen and scripts/ci/verify-schema.sh)
- [ ] #11 Documentation artifacts are updated (pnpm docs:artifacts)
- [ ] #12 Automated verification scripts pass (FSM consistency and event log coverage)
<!-- DOD:END -->
