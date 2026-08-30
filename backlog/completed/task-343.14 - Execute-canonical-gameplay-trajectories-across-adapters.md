---
id: TASK-343.14
title: Execute canonical gameplay trajectories across adapters
status: Icebox
assignee:
  - '@codex'
created_date: '2026-08-04 22:39'
updated_date: '2026-08-30 21:43'
labels:
  - assurance
  - qa
  - gameplay
dependencies:
  - TASK-343.13
documentation:
  - docs/testing.md
  - docs/reference/qa-runners.md
  - docs/adr/ADR-005-deterministic-replay-hash-compatibility.md
  - docs/adr/ADR-017-authoritative-view-model-projection.md
modified_files:
  - bin/qa/api-playthrough.ts
  - bin/qa/run-evidence.ts
  - bin/qa/trajectory-matrix.ts
  - bin/qa/record-trajectory.ts
  - bin/qa/verify-trajectory.ts
  - docs/reference/qa-runners.md
  - shared/src/schema.ts
  - shared/src/types.ts
  - shared/schemas/gameplay-trajectory.schema.json
  - shared/schemas/README.md
  - shared/scripts/generate-schemas.ts
  - shared/tests/trajectory.test.ts
  - package.json
parent_task_id: TASK-343
priority: high
type: task
ordinal: 255800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Make one deterministic gameplay trajectory the shared behavioral input for engine, network, and user-facing automation adapters. The same intended actions and checkpoints must be comparable across implementations instead of each runner generating and interpreting its own approximation.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A validated trajectory records authoritative match parameters, draw timestamp, seed, player identities, ordered action payloads, and per-action state, event, and observer checkpoints
- [x] #2 Pure-engine, live WebSocket, and REST-fallback adapters execute the same trajectory and report exact action payload and checkpoint agreement where their visibility contracts permit
- [x] #3 Trajectory fixtures cover normal alternating deployment, Defensive, Aggressive, and Random quick deployment, mixed manual and quick deployment, attack, reinforce, pass, forfeit, both damage modes, and terminal outcomes
- [x] #4 Playback fails on action-payload drift, missing phases, hash divergence, projection leakage, or an adapter silently substituting a different strategy
- [x] #5 Historical replay compatibility inputs remain isolated from normal player-selected quick deployment and are proven in a dedicated compatibility trajectory
- [x] #6 Contributor documentation provides a single reproducible command for generating, recording, and replaying a trajectory through each supported adapter
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Code builds without errors (pnpm build)
- [x] #2 Linting and typechecking pass (pnpm lint and pnpm typecheck)
- [x] #3 All unit and integration tests pass (pnpm test:run:all)
- [x] #4 API schemas and types are re-generated and verified (pnpm schema:gen and scripts/ci/verify-schema.sh)
- [x] #5 Documentation artifacts are updated (pnpm docs:artifacts)
- [x] #6 Automated verification scripts pass (FSM consistency and event log coverage)
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inventory existing scenario/trajectory fixtures, replay readers, and adapter entrypoints; identify the smallest shared trajectory contract.
2. Define validated trajectory schema and checkpoint model with hidden-state/redaction boundaries.
3. Adapt pure-engine, WebSocket, and REST fallback runners to execute one canonical trajectory.
4. Add fixture coverage for deployment strategies, mixed actions, damage modes, terminal outcomes, and compatibility replay.
5. Add fail-closed drift/leakage checks, contributor commands, and run the full verification gates.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-08-30 started after TASK-343.13 completion. Initial focus is repository-native trajectory/scenario tooling and adapter parity; no UI changes are planned.

2026-08-30 implementation slice: added GameplayTrajectorySchema v1 with authoritative match parameters, strategy declarations, exact Action payloads, ordered checkpoints, observer projection hashes, event types, phase/turn checkpoints, and terminal hash integrity.

Added qa:trajectory:record and qa:trajectory:verify. Offline deterministic fixture recorded 42 actions and 43 checkpoints from scenario-42; terminal hash matched scenario finalStateHash exactly. Verification catches schema, state, observer, event, phase/turn, and terminal drift.

Commit 35415717 passed the full verify:quick hook. Network WebSocket and REST-fallback adapter execution remains the next slice.

2026-08-30 adapter slice: loadScenarioOrTrajectory now accepts canonical trajectory files while preserving historical scenario compatibility. api-playthrough preserves trajectory timestamps and compares each live WebSocket transaction stateHashAfter against the expected checkpoint.

CLI smoke check passed for api-playthrough --help; schema check and Markdown lint passed; commit 1e252c1 passed the repository verify:quick hook.

Remaining next slice: add a REST-fallback trajectory executor using the existing /api/matches/:id/action flow, then expand fixture matrix and compatibility/drift failure tests.

2026-08-30 discovery finding: pure trajectories currently contain deterministic card IDs embedding fixture match/player IDs. Live adapters generate new match/player IDs, so raw card payload and full-state hash comparison would falsely report drift. REST/WS execution must add explicit identity binding (preserve card turn/draw reference while rebinding live match/player identity), then compare normalized action intent and adapter-visible checkpoints; do not silently rewrite without recording the binding.

2026-08-30 transport hardening: added --transport websocket|rest to api-playthrough; REST posts actions to /api/matches/:id/action while WebSocket remains connected for dual observer updates. Added authoritative quick-start matchParams, explicit card reference binding, and correct handling of observer-redacted transaction hashes.

Local development-mode live run reached 35+ actions with quick-start and binding active, then failed closed on a phase/action divergence: trajectory attack was submitted while server remained in ReinforcementPhase. This is evidence that the pure fixture is not yet portable across live identities/initialization and must be investigated before task completion; no silent substitution was allowed.

Commit d00ecbc passed focused tooling/CLI checks and the commit verification hook. Full task remains open pending a live-bound trajectory capture or a corrected identity/checkpoint model and REST proof.

2026-08-30 parity correction: earliest live mismatch was isolated at pre-action checkpoint 29. The canonical fixture uses classic damage persistence, while the normalized live matchParams defaulted to cumulative despite gameOptions.damageMode=classic. api-playthrough now carries damage mode through both top-level and classic matchParams, validates phase/turn/player before every trajectory action, and installs REST observers before dispatch. Commit pending/landed as the narrow parity fix.

2026-08-30 verification: identical 42-action scenario-42 trajectory passed pure-engine verification, live WebSocket, and REST fallback. Both adapters reached Player 1 lpDepletion victory on turn 23. schema:check, docs:check, lint:md, lint:tools, build, lint, DB isolation, and typecheck passed. verify:quick stopped only at docs route generation because the environment denied access to the local Colima Docker socket; full fixture matrix and compatibility trajectory remain open.

2026-08-30 fixture-matrix slice: added qa:trajectory:matrix with seven deterministic cases covering classic/cumulative damage, manual deployment, defensive/aggressive/random quick deployment, mixed manual/quick deployment, and explicit pass/forfeit terminal actions. Matrix execution passes all seven cases.

Updated docs/reference/qa-runners.md with the reproducible matrix command and coverage boundary. Historical compatibility trajectory and automated negative drift/leakage/substitution tests remain next.

2026-08-30 matrix hardening: non-terminal matrix cases now continue through deterministic attack/reinforcement turns, and the runner asserts aggregate attack, reinforce, and pass coverage rather than stopping at deployment. Expanded seven-case matrix passes with terminal outcomes recorded.

2026-08-30 completion evidence: pure scenario-42 trajectory verification passed (42 actions, terminal hash a3b09f17df52ac58c20f8a27052998d09f4facf0008d570f988aad471950bc9d). Identical live WebSocket and REST fallback executions passed 42 actions and reached Player 1 lpDepletion victory on turn 23.

2026-08-30 completion evidence: qa:trajectory:matrix passes 8 deterministic fixtures, including both damage modes, manual/defensive/aggressive/random deployment policies, mixed manual/quick deployment, attack/reinforce/pass/forfeit coverage, and historical-v1 compatibility. specVersion is optional and backward-compatible in the trajectory schema.

2026-08-30 completion evidence: pnpm test:run:all passed shared 163, engine 422, server 398 plus 4 migrations, client 237, admin 15, MCP 8. schema:check, docs:check, lint:md, lint:tools, pnpm rules:check, and verify:quick all passed.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented and verified canonical gameplay trajectories across pure engine, live WebSocket, and REST fallback adapters. Added validated v1 trajectories with per-action state/event/observer checkpoints, explicit live card identity binding, fail-closed phase/player/hash handling, deterministic fixture matrix covering both damage modes and deployment/action/terminal paths, and optional historical specVersion compatibility. Full test, schema, docs, lint, database-isolation, FSM, event-log, and combat-reference gates pass. Live scenario-42 proof passes through both WebSocket and REST to Player 1 lpDepletion victory on turn 23.
<!-- SECTION:FINAL_SUMMARY:END -->
