---
id: TASK-328.09
title: V2-GODOT-025 - Godot spectator/live-director parity slice
status: Done
assignee: []
created_date: '2026-06-16 01:19'
updated_date: '2026-06-20 03:28'
labels: []
milestone: m-14
dependencies:
  - TASK-324
  - TASK-328.08
references:
  - client/src/lobby.tsx
  - client/src/game.tsx
  - godot/client/scenes/SpectatorHud.gd
  - godot/client/scenes/MatchRoot.tscn
  - godot/client/scripts/ConnectionClient.gd
documentation:
  - docs/reference/playthrough-scenarios.md
  - .agents/skills/phalanx-godot-ux-parity/references/parity-workflow.md
parent_task_id: TASK-328
priority: high
ordinal: 169900
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Port the browser/reference spectator experience to Godot so a neutral observer can watch the automated match with match metadata, phase state, board state, player LP, and play-by-play log. This surface is the preferred visual confirmation and recording path for Steam/demo work.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Godot spectator mode renders active match metadata, player names, phase/turn state, board state, and LP for both players without player-perspective ambiguity.
- [ ] #2 Godot renders a play-by-play or event log feed sourced from authoritative match/replay data.
- [ ] #3 The spectator surface can follow a deterministic replay/scenario from deployment through combat and terminal states without manual player input.
- [ ] #4 The Godot artifact captures observer screenshots for start, deployment, combat, and game-over when those states are present.
- [ ] #5 The implementation integrates with or completes the existing spectator live-director task rather than creating a parallel spectator model.
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
