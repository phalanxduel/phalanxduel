---
id: TASK-125
title: Unify Scenario Orchestration across Headless and API Runners
status: In Progress
assignee:
  - '@codex'
created_date: '2026-03-30 19:45'
updated_date: '2026-04-01 12:26'
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

## Implementation Plan

- Turn the existing `bin/qa/scenario.ts` shape into a validated shared scenario
  contract with a canonical loader instead of loose JSON parsing.
- Refactor both runners to consume that loader and stop using `any`-based
  scenario access.
- Verify the scenario generator and both runner entrypoints still load against
  the shared contract before expanding the schema further.

## Implementation Notes

- `bin/qa/scenario.ts` now exports `GameScenarioSchema`, `ScenarioPlayerTypeSchema`,
  and `loadScenario()` so both runners can validate the same file shape.
- `bin/qa/api-playthrough.ts` now loads scenario files through `loadScenario()`
  instead of manual `JSON.parse(...) as GameScenario`.
- `bin/qa/simulate-headless.ts` now carries typed `fileData?: GameScenario`
  state and uses the validated scenario actions/final hash instead of
  `any`-style access.
- `bin/qa/generate-scenario.ts` now validates its own output through
  `GameScenarioSchema`.
- The existing `bin/qa/scenario.ts` import path to `@phalanxduel/engine` was
  not runnable under `tsx` in this workspace, so the scenario helper now uses
  repo-local source imports for the engine and shared modules.

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code builds without errors (pnpm build)
- [ ] #2 Linting and typechecking pass (pnpm lint and pnpm typecheck)
- [ ] #3 All unit and integration tests pass (pnpm test:run:all)
- [ ] #4 API schemas and types are re-generated and verified (pnpm schema:gen and scripts/ci/verify-schema.sh)
- [ ] #5 Documentation artifacts are updated (pnpm docs:artifacts)
- [ ] #6 Automated verification scripts pass (FSM consistency and event log coverage)
<!-- DOD:END -->
