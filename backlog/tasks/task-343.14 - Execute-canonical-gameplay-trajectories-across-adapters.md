---
id: TASK-343.14
title: Execute canonical gameplay trajectories across adapters
status: To Do
assignee: []
created_date: '2026-08-04 22:39'
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
