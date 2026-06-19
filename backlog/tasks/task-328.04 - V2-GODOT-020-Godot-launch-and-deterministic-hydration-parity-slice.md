---
id: TASK-328.04
title: V2-GODOT-020 - Godot launch and deterministic hydration parity slice
status: In Progress
assignee: []
created_date: '2026-06-16 01:18'
updated_date: '2026-06-19 02:33'
labels: []
milestone: m-14
dependencies:
  - TASK-315
  - TASK-327
  - TASK-328.02
  - TASK-328.03
references:
  - godot/client/project.godot
  - godot/client/scenes/Main.tscn
  - godot/client/scenes/MatchRoot.tscn
  - godot/client/scripts/GameViewStore.gd
  - bin/qa/godot-playthrough.ts
documentation:
  - docs/reference/qa-runners.md
  - docs/reference/pnpm-scripts.md
  - .agents/skills/phalanx-godot-ux-parity/SKILL.md
parent_task_id: TASK-328
priority: high
ordinal: 169400
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Make the Godot client launch into a deterministic hydrated playthrough state that can be compared to the browser/reference artifact. This slice is the first visible Godot parity step: the client must start without the editor, consume replay/scenario/reference input, render an initial stable state, and emit checkpoints/screenshots through the artifact contract.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Godot can launch headlessly and visibly from the local runner without opening the editor UI.
- [ ] #2 The runner can load deterministic replay or scenario input derived from the browser/reference playthrough contract.
- [ ] #3 Godot emits stable checkpoints for launch, input-loaded, hydrated, and render-idle states.
- [ ] #4 The Godot artifact contains an initial screenshot and manifest fields sufficient for the parity comparator to evaluate the slice.
- [ ] #5 The implementation does not duplicate gameplay rules in GDScript; it consumes TypeScript-engine-derived state or committed replay/scenario data.
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
