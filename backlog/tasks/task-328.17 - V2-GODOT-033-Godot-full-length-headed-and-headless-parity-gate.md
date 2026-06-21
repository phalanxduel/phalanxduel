---
id: TASK-328.17
title: 'V2-GODOT-033 - Godot full-length, headed, and headless parity gate'
status: Done
assignee: []
created_date: '2026-06-16 01:21'
labels: []
milestone: m-14
dependencies:
  - TASK-328.12
  - TASK-328.13
  - TASK-328.14
  - TASK-328.15
  - TASK-328.16
references:
  - bin/qa/godot-playthrough.ts
  - bin/qa/godot-automation.ts
  - godot/client/
  - artifacts/playthrough-head2head/
documentation:
  - docs/reference/qa-runners.md
  - docs/reference/pnpm-scripts.md
  - .agents/skills/phalanx-end-to-end-playthrough/SKILL.md
  - .agents/skills/phalanx-godot-ux-parity/SKILL.md
parent_task_id: TASK-328
priority: high
ordinal: 170700
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Promote the Godot parity harness from fast LP3 proof to a broader release-facing gate. This task verifies that Godot can complete full-length LP20 pacing, visible headed playback for human confirmation, and headless automation for agents/CI without diverging from the browser/reference contract.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Godot completes at least one LP20 full-length reference scenario or documented scenario matrix without timing out under the agreed turn/action limits.
- [ ] #2 Godot headed/visible playthrough opens, renders, advances through the match, and exits or leaves a clear artifact path suitable for human visual confirmation.
- [ ] #3 Godot headless playthrough completes the same core scenario and writes artifacts without requiring editor UI or manual interaction.
- [ ] #4 The parity comparator reports pass or documented acceptable differences for LP3 and LP20 representative runs.
- [ ] #5 Docs identify the exact commands to run for fast local proof, full-length pacing, headed visual confirmation, and headless automation.
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
