---
id: TASK-328.07
title: V2-GODOT-023 - Godot combat UX and input automation parity slice
status: Done
assignee: []
created_date: '2026-06-16 01:19'
updated_date: '2026-06-20 18:17'
labels: []
milestone: m-14
dependencies:
  - TASK-319
  - TASK-320
  - TASK-328.06
references:
  - client/src/game.tsx
  - engine/src/combat-preview.ts
  - shared/src/combat-resolution.ts
  - godot/client/scenes/Battlefield.gd
  - godot/client/scripts/InputDirector.gd
documentation:
  - docs/reference/qa-runners.md
  - docs/agents/skills/gameplay-automation.md
  - .agents/skills/phalanx-godot-ux-parity/references/parity-workflow.md
parent_task_id: TASK-328
priority: high
ordinal: 169700
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Port the browser/reference combat phase into Godot with attackable card feedback, valid target feedback, combat preview/verdict display, pass/skip controls, authoritative action submission, and screenshot/checkpoint evidence. This slice should reuse engine-derived combat previews and step data rather than duplicating attack rules in Godot.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Godot renders combat phase state with active player, attackable cards, valid targets, pass/skip controls, and opponent/player LP context.
- [ ] #2 Godot displays combat preview or verdict information equivalent to the reference client for available attacks.
- [ ] #3 Automation can select an attacker and target, submit the intent, and observe the resulting authoritative board/LP update.
- [ ] #4 The Godot artifact includes combat screenshots/events/checkpoints that the comparator can evaluate against the reference artifact scope.
- [ ] #5 The implementation consumes shared/engine combat explanation or step data and does not reimplement combat resolution in GDScript.
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
