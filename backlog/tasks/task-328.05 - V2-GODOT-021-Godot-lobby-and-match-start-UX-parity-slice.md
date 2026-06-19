---
id: TASK-328.05
title: V2-GODOT-021 - Godot lobby and match-start UX parity slice
status: Done
assignee: [Antigravity]
created_date: '2026-06-16 01:18'
updated_date: '2026-06-19 14:37'
labels: []
milestone: m-14
dependencies:
  - TASK-316
  - TASK-326
  - TASK-328.04
references:
  - client/src/lobby.tsx
  - godot/client/scenes/Main.tscn
  - godot/client/scenes/MatchRoot.tscn
  - godot/client/scripts/ConnectionClient.gd
documentation:
  - docs/reference/playthrough-scenarios.md
  - >-
    .agents/skills/phalanx-end-to-end-playthrough/references/local-playthrough-runbook.md
  - .agents/skills/phalanx-godot-ux-parity/references/parity-workflow.md
parent_task_id: TASK-328
priority: high
ordinal: 169500
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Port the browser/reference lobby and match-start experience into Godot with automation evidence. The Godot client should show the same essential user-facing readiness, player identity, match metadata, mode, starting LP, and transition into gameplay that the reference playthrough proves.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Godot renders lobby/readiness state with player names or identities, match id/metadata when available, mode, and starting LP.
- [ ] #2 The Godot flow can advance from lobby/match-start into the deployment screen through automation or deterministic replay progression.
- [ ] #3 The artifact includes lobby/match-start screenshots and checkpoints that the comparator can evaluate against the reference artifact scope.
- [ ] #4 Failure states for missing server connection or missing replay/scenario input are visible and produce non-zero runner failures.
- [ ] #5 Docs or run output clearly distinguish live match start, replay-driven start, and demo fallback behavior.
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
