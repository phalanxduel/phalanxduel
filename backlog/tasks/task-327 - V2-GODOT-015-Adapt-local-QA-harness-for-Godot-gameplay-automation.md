---
id: TASK-327
title: V2-GODOT-015 - Adapt local QA harness for Godot gameplay automation
status: Icebox
assignee:
  - '@codex'
created_date: '2026-06-14 22:55'
updated_date: '2026-07-03 19:00'
labels: []
milestone: m-14
dependencies: []
documentation:
  - docs/testing.md
  - docs/reference/qa-runners.md
  - mcp/README.md
  - docs/agents/agentic-gameplay.md
modified_files:
  - package.json
  - bin/qa/godot-automation.ts
  - bin/qa/scenario.ts
  - godot/client/scripts/AutomationHarness.gd
  - godot/client/scripts/GameViewStore.gd
  - engine/tests/qa-scenario.test.ts
  - docs/reference/pnpm-scripts.md
priority: low
ordinal: 168000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create the first local QA harness slice for the v2 Godot client so agents can exercise gameplay automation against committed scenario/replay data from the repository without opening the Godot editor UI. The existing TypeScript QA harnesses already generate deterministic scenario and replay data; this task should bridge that data into a Godot-local verification path and expose it through pnpm so future automation can build on it.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A local pnpm QA command invokes the Godot client project in headless/scripted mode and fails non-zero on harness failures.
- [x] #2 The harness consumes deterministic scenario or replay data generated from existing TypeScript engine tooling instead of duplicating gameplay rules in GDScript.
- [x] #3 Godot-side automation reports at least connected, hydrated, and animation-idle style checkpoints in a machine-readable form suitable for CI/local agents.
- [x] #4 Docs or script help explain how to run the local Godot automation harness and what prerequisites are required.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Confirm local Godot CLI behavior against `godot/client` and keep the harness editor-free/headless.
2. Add a TypeScript QA wrapper under `bin/qa/` that generates or loads deterministic scenario data via the existing `bin/qa/scenario.ts` engine contract, writes a temporary harness input file, invokes Godot headless, and propagates non-zero failures.
3. Add a Godot automation verifier script under `godot/client/scripts/` that reads the harness input, hydrates `GameViewStore` with scenario/replay metadata, verifies `connected`, `hydrated`, and `animation_idle` checkpoints, and writes machine-readable JSON results.
4. Wire a root `pnpm` script for the local Godot harness and document usage/prerequisites in QA runner docs.
5. Run targeted verification: the new pnpm command, `pnpm qa:replay:verify`, and a focused typecheck/lint path if the TypeScript wrapper touches typed tooling.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented the first local Godot gameplay automation harness slice. Added `pnpm qa:godot:automation`, which generates or loads deterministic TypeScript engine scenario data, launches the Godot client project headlessly with a temporary `HOME`, and writes machine-readable checkpoint results under `artifacts/godot-automation/`. Added `AutomationHarness.gd` and ordered checkpoint history on `GameViewStore` for `connected`, `hydrated`, and `animation_idle`. Also hardened `bin/qa/scenario.ts` so generated scenarios use deterministic timestamps plus `computeStateHash`, and added engine test coverage for stable non-empty `finalStateHash`.

Verification so far:
- `rtk pnpm qa:godot:automation` passed outside the sandbox; the sandboxed run fails before script execution due `tsx` IPC `EPERM` on `/var/folders/.../tsx-*.pipe`.
- `rtk pnpm --filter @phalanxduel/engine test tests/qa-scenario.test.ts` passed: 1 file, 2 tests.
- `rtk pnpm qa:replay:verify` passed outside the sandbox: 20/20 replay checks.
- `rtk pnpm --dir engine typecheck` passed.
- `rtk pnpm lint:tools` passed.
- Explicit `rtk pnpm exec eslint --no-ignore bin/qa/godot-automation.ts bin/qa/scenario.ts engine/tests/qa-scenario.test.ts` passed with filesystem path warnings only.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code builds without errors (pnpm build)
- [ ] #2 Linting and typechecking pass (pnpm lint and pnpm typecheck)
- [ ] #3 All unit and integration tests pass (pnpm test:run:all)
- [ ] #4 API schemas and types are re-generated and verified (pnpm schema:gen and scripts/ci/verify-schema.sh)
- [ ] #5 Documentation artifacts are updated (pnpm docs:artifacts)
- [ ] #6 Automated verification scripts pass (FSM consistency and event log coverage)
<!-- DOD:END -->
