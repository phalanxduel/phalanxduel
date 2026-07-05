---
id: TASK-328.10
title: V2-GODOT-026 - Godot game-over and final result parity slice
status: Done
assignee: []
created_date: '2026-06-16 01:19'
updated_date: '2026-07-05 16:44'
labels: []
milestone: m-14
dependencies:
  - TASK-328.09
references:
  - client/src/game-over.tsx
  - client/src/ux-derivations.ts
  - godot/client/scenes/SpectatorHud.gd
  - godot/client/scenes/MatchRoot.tscn
documentation:
  - docs/reference/qa-runners.md
  - >-
    .agents/skills/phalanx-end-to-end-playthrough/references/local-playthrough-runbook.md
  - .agents/skills/phalanx-godot-ux-parity/references/parity-workflow.md
parent_task_id: TASK-328
priority: high
ordinal: 170000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Port the browser/reference game-over experience into Godot with structured winner, victory reason, final LP score, and turning-point/log evidence. This task makes Godot produce the same terminal result evidence that the v1 playthrough harness reports from `manifest.json` and the game-over screenshot.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Godot renders terminal match state with winner name, victory type/reason, final LP score for both players, and replay/log or turning-point context when available.
- [x] #2 The Godot manifest records `winnerName`, `victorySummaryText`, `lifepointsText`, `finalLifepoints`, `turnCount`, and `actionCount` for completed runs.
- [x] #3 The Godot artifact includes a game-over screenshot from an observer or unambiguous neutral perspective.
- [x] #4 The comparator can verify final result parity against the browser/reference artifact for deterministic complete runs.
- [x] #5 The screen remains usable in visible/headed mode for human visual confirmation.
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
