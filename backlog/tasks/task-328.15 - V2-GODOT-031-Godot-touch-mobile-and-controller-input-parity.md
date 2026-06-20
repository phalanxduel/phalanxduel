---
id: TASK-328.15
title: 'V2-GODOT-031 - Godot touch, mobile, and controller input parity'
status: Done
assignee: []
created_date: '2026-06-16 01:20'
labels: []
milestone: m-14
dependencies:
  - TASK-322
  - TASK-328.12
references:
  - godot/client/scripts/InputDirector.gd
  - godot/client/scenes/Battlefield.gd
  - godot/client/scenes/Hand.tscn
documentation:
  - docs/reference/playthrough-scenarios.md
  - .agents/skills/phalanx-godot-ux-parity/references/parity-workflow.md
parent_task_id: TASK-328
priority: high
ordinal: 170500
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Bring Godot input behavior to parity with the reference playthrough for touch/mobile-style interactions and Steam-friendly controller navigation. This task should reuse the deployed gameplay screens and scenario artifacts rather than creating separate UI flows.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Godot supports the deployment, combat, reinforcement, pass/skip, and game-over confirmation interactions using touch-sized pointer input and keyboard/controller-style focus or actions.
- [ ] #2 Automation can exercise the complete LP3 reference playthrough using the selected non-mouse input mode or a deterministic equivalent action driver.
- [ ] #3 Interactive targets remain stable and large enough for mobile/touch and controller navigation without layout shifts that break automation.
- [ ] #4 Artifacts include screenshots or checkpoint metadata proving the selected input mode reached deployment, combat, and game-over.
- [ ] #5 Docs state the supported input mode assumptions for the Steam-facing Godot client.
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
