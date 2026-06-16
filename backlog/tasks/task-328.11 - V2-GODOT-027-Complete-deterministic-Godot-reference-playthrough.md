---
id: TASK-328.11
title: V2-GODOT-027 - Complete deterministic Godot reference playthrough
status: Backlog
assignee: []
created_date: '2026-06-16 01:19'
labels: []
milestone: m-14
dependencies:
  - TASK-328.10
references:
  - bin/qa/godot-playthrough.ts
  - bin/qa/godot-automation.ts
  - godot/client/
  - artifacts/playthrough-head2head/
documentation:
  - docs/reference/qa-runners.md
  - docs/reference/playthrough-scenarios.md
  - .agents/skills/phalanx-end-to-end-playthrough/SKILL.md
  - .agents/skills/phalanx-godot-ux-parity/SKILL.md
parent_task_id: TASK-328
priority: high
ordinal: 170100
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Drive Godot through the full browser/reference playthrough journey from match start through game-over using deterministic scenario/replay data and the shared parity artifact/comparator contract. This task is the first end-to-end Godot parity milestone before expanding to the wider scenario matrix.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A single local command runs Godot from deterministic reference input through deployment, combat/follow-up phases, spectator or neutral presentation, and game-over.
- [ ] #2 The run produces browser-equivalent Godot artifacts with manifest, events, checkpoints, and key screenshots.
- [ ] #3 The parity comparator passes for the canonical LP3 seeded reference scenario or reports only documented acceptable visual gaps.
- [ ] #4 The final result in Godot matches the reference winner, victory reason, and final LP score for the deterministic input.
- [ ] #5 The run works headlessly for agents and visibly for human confirmation.
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
