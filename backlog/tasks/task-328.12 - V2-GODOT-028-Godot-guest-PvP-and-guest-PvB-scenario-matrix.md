---
id: TASK-328.12
title: V2-GODOT-028 - Godot guest PvP and guest PvB scenario matrix
status: done
progress: 100
assignee: []
created_date: '2026-06-16 01:20'
labels: []
milestone: m-14
dependencies:
  - TASK-328.11
references:
  - bin/qa/simulate-headless.ts
  - bin/qa/godot-playthrough.ts
  - server/src/match.ts
documentation:
  - docs/reference/playthrough-scenarios.md
  - docs/reference/qa-runners.md
  - .agents/skills/phalanx-godot-ux-parity/references/parity-workflow.md
parent_task_id: TASK-328
priority: high
ordinal: 170200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Expand the complete deterministic Godot playthrough into the two core guest scenarios from the browser reference harness: guest PvP and guest PvB. This task proves Godot can handle both two-player human-style automation and built-in bot-opponent flows with equivalent artifacts.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Godot automation runs a guest PvP scenario from match start through game-over and writes parity artifacts.
- [ ] #2 Godot automation runs a guest PvB scenario against at least the random or heuristic bot-opponent path and writes parity artifacts.
- [ ] #3 Both scenarios record structured winner, score, turn/action counts, and key screenshots in Godot manifests.
- [ ] #4 The parity comparator can compare each Godot scenario against its browser/reference artifact or a documented equivalent reference run.
- [ ] #5 Docs list the exact commands and artifact locations for both guest PvP and guest PvB Godot runs.
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
