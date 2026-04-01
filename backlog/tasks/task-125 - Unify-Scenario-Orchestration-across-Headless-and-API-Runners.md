---
id: TASK-125
title: Unify Scenario Orchestration across Headless and API Runners
status: Human Review
assignee:
  - '@codex'
created_date: '2026-03-30 19:45'
updated_date: '2026-04-01 14:00'
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
- [x] #1 #1 Create a shared 'Scenario' schema that includes starting seeds, player configurations, and expected action sequences.
- [x] #2 #2 Refactor bin/qa/simulate-headless.ts to accept a scenario file as input.
- [x] #3 #3 Refactor bin/qa/api-playthrough.ts to accept the same scenario file.
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
- `engine/tests/qa-scenario.test.ts` now proves the shared scenario contract by
  validating generated scenarios and loading a scenario file from disk through
  the canonical loader.

## Verification

- `rtk pnpm --filter @phalanxduel/engine test -- tests/qa-scenario.test.ts`
- `rtk pnpm exec tsx bin/qa/api-playthrough.ts --help`
- `rtk pnpm exec tsx bin/qa/simulate-headless.ts --help`
- `rtk pnpm exec tsx bin/qa/generate-scenario.ts 42`
- `rtk ./bin/check`

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Code builds without errors (pnpm build)
- [x] #2 Linting and typechecking pass (pnpm lint and pnpm typecheck)
- [x] #3 All unit and integration tests pass (pnpm test:run:all)
- [x] #4 API schemas and types are re-generated and verified (pnpm schema:gen and scripts/ci/verify-schema.sh)
- [x] #5 Documentation artifacts are updated (pnpm docs:artifacts)
- [x] #6 Automated verification scripts pass (FSM consistency and event log coverage)
<!-- DOD:END -->
