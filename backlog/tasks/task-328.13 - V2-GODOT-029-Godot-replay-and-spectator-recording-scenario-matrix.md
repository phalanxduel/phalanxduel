---
id: TASK-328.13
title: V2-GODOT-029 - Godot replay and spectator recording scenario matrix
status: done
assignee: []
created_date: '2026-06-16 01:20'
labels: []
milestone: m-14
dependencies:
  - TASK-321
  - TASK-328.09
  - TASK-328.11
references:
  - godot/client/scripts/ReplayController.gd
  - godot/client/scenes/SpectatorHud.gd
  - client/src/lobby.tsx
  - client/src/game.tsx
documentation:
  - docs/reference/playthrough-scenarios.md
  - .agents/skills/phalanx-godot-ux-parity/references/parity-workflow.md
parent_task_id: TASK-328
priority: high
ordinal: 170300
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Expand Godot parity coverage to replay playback and spectator/recording flows. This task makes the Godot client useful for visual confirmation, debugging, and future Steam media capture by proving it can replay or observe complete matches with stable artifacts.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Godot can replay a deterministic completed match artifact from start through game-over without live player input.
- [ ] #2 Godot spectator mode can observe or playback the same match with neutral player naming, LP, phase, board, and event log presentation.
- [ ] #3 The Godot run captures screenshots suitable for visual confirmation or recording at start, deployment, combat, and game-over.
- [ ] #4 Replay/spectator manifests include enough metadata to tie the Godot run back to the browser/reference artifact and seed.
- [ ] #5 The parity comparator supports replay/spectator mode or documents any expected differences from active player mode.
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
