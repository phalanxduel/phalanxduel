---
id: TASK-328.06
title: V2-GODOT-022 - Godot deployment UX and input automation parity slice
status: Backlog
assignee: []
created_date: '2026-06-16 01:19'
labels: []
milestone: m-14
dependencies:
  - TASK-318
  - TASK-328.05
references:
  - client/src/game.tsx
  - godot/client/scenes/Battlefield.tscn
  - godot/client/scenes/Battlefield.gd
  - godot/client/scenes/Hand.tscn
  - godot/client/scripts/InputDirector.gd
documentation:
  - docs/reference/qa-runners.md
  - .agents/skills/phalanx-godot-ux-parity/references/parity-workflow.md
parent_task_id: TASK-328
priority: high
ordinal: 169600
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Port the deployment phase from the browser/reference playthrough to Godot with equivalent hand rendering, playable-card state, selected-card feedback, valid target cells, intent submission, and board updates. This is the first high-value gameplay interaction slice because it proves Godot can render state and accept player intent through the same user journey.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Godot renders the player hand, battlefield grid, playable card state, selected card feedback, and valid deployment targets for deployment frames.
- [ ] #2 Automation can choose a playable card and deployment cell, submit the intent, and observe the board update from confirmed authoritative state.
- [ ] #3 The Godot artifact captures deployment start and action screenshots, events, and checkpoints matching the reference artifact scope.
- [ ] #4 The slice supports both replay-driven progression and live intent submission when connection/session data is available.
- [ ] #5 The comparator can run in partial-slice mode and confirm deployment artifact coverage without requiring later combat/game-over parity.
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
