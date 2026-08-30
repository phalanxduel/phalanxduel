---
id: TASK-343.14
title: Execute canonical gameplay trajectories across adapters
status: In Progress
assignee:
  - '@codex'
created_date: '2026-08-04 22:39'
updated_date: '2026-08-30 14:43'
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
  - shared/src/schema.ts
  - shared/src/types.ts
  - shared/schemas/gameplay-trajectory.schema.json
  - shared/schemas/README.md
  - shared/scripts/generate-schemas.ts
  - shared/tests/trajectory.test.ts
  - bin/qa/record-trajectory.ts
  - bin/qa/verify-trajectory.ts
  - package.json
  - docs/reference/qa-runners.md
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
- [ ] #1 A validated trajectory records authoritative match parameters, draw timestamp, seed, player identities, ordered action payloads, and per-action state, event, and observer checkpoints
- [ ] #2 Pure-engine, live WebSocket, and REST-fallback adapters execute the same trajectory and report exact action payload and checkpoint agreement where their visibility contracts permit
- [ ] #3 Trajectory fixtures cover normal alternating deployment, Defensive, Aggressive, and Random quick deployment, mixed manual and quick deployment, attack, reinforce, pass, forfeit, both damage modes, and terminal outcomes
- [ ] #4 Playback fails on action-payload drift, missing phases, hash divergence, projection leakage, or an adapter silently substituting a different strategy
- [ ] #5 Historical replay compatibility inputs remain isolated from normal player-selected quick deployment and are proven in a dedicated compatibility trajectory
- [ ] #6 Contributor documentation provides a single reproducible command for generating, recording, and replaying a trajectory through each supported adapter
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
<!-- SECTION:NOTES:END -->
