---
id: TASK-328.18
title: V2-GODOT-034 - Steam-ready Godot UX parity exit gate
status: Done
assignee: []
created_date: '2026-06-16 01:21'
updated_date: '2026-06-20 18:18'
labels: []
milestone: m-14
dependencies:
  - TASK-328.17
references:
  - godot/client/
  - artifacts/playthrough-head2head/
  - artifacts/godot-automation/
documentation:
  - docs/reference/qa-runners.md
  - docs/reference/pnpm-scripts.md
  - docs/testing.md
  - .agents/skills/phalanx-godot-ux-parity/SKILL.md
parent_task_id: TASK-328
priority: high
ordinal: 170800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Close the Godot v2 UX parity workstream by verifying that the Godot client is the primary Steam-ready user experience for the complete gameplay journey. This task should only start after the scenario and input gates pass; it is the final conversion checkpoint, not an implementation grab bag.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The Godot client can complete the core gameplay journey from match setup through game-over with automation evidence and human-visible confirmation.
- [ ] #2 The browser/reference playthrough remains available as an oracle, but the Godot client has equivalent artifacts for all required scenarios: guest PvP, guest PvB, replay, spectator, auth PvP/PvB where supported, touch/controller input, LP3 fast proof, LP20 full-length pacing, headed visible, and headless automation.
- [ ] #3 The final documentation states which UX surfaces are now primary in Godot, which browser surfaces remain reference-only, and any accepted parity gaps.
- [ ] #4 A final verification bundle includes browser/reference artifacts, Godot artifacts, comparator reports, and exact commands for reproducing them.
- [ ] #5 The backlog workstream can be marked done without leaving hidden manual steps required to play or visually confirm a Godot match.
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
