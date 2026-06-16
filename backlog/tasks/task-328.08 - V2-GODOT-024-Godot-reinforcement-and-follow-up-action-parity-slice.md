---
id: TASK-328.08
title: V2-GODOT-024 - Godot reinforcement and follow-up action parity slice
status: Backlog
assignee: []
created_date: '2026-06-16 01:19'
labels: []
milestone: m-14
dependencies:
  - TASK-328.07
references:
  - client/src/game.tsx
  - godot/client/scripts/InputDirector.gd
  - godot/client/scenes/Hand.tscn
  - godot/client/scenes/Battlefield.gd
documentation:
  - docs/reference/playthrough-scenarios.md
  - .agents/skills/phalanx-godot-ux-parity/references/parity-workflow.md
parent_task_id: TASK-328
priority: high
ordinal: 169800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Port the browser/reference reinforcement and follow-up action states into Godot so automated matches can continue after combat results that require additional input. This task closes the gap between isolated combat actions and a complete match loop.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Godot renders reinforcement prompts, reinforce-playable cards, valid reinforcement columns, and skip/pass controls when the authoritative state requires them.
- [ ] #2 Automation can complete reinforcement or skip/pass follow-up actions and advance to the next authoritative phase.
- [ ] #3 The Godot artifact records reinforcement/follow-up events, checkpoints, and screenshots when the reference scenario reaches those states.
- [ ] #4 The input model works for both mouse-style automation and touch/controller-compatible action selection semantics.
- [ ] #5 Partial parity comparison can verify reinforcement coverage independently from final game-over parity.
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
