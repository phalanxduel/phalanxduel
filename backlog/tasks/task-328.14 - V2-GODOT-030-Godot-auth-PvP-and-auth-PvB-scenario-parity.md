---
id: TASK-328.14
title: V2-GODOT-030 - Godot auth PvP and auth PvB scenario parity
status: Done
assignee: []
created_date: '2026-06-16 01:20'
updated_date: '2026-07-05 16:44'
labels: []
milestone: m-14
dependencies:
  - TASK-328.12
references:
  - client/src/auth.ts
  - client/src/components/AuthPanel.tsx
  - godot/client/scripts/ConnectionClient.gd
  - server/src/routes/auth.ts
documentation:
  - docs/reference/playthrough-scenarios.md
  - docs/configuration.md
  - .agents/skills/phalanx-godot-ux-parity/references/parity-workflow.md
parent_task_id: TASK-328
priority: medium
ordinal: 170400
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add Godot parity coverage for authenticated PvP and PvB scenarios after the guest scenarios are stable. This task ensures the Godot client can preserve session-aware match flows where the browser reference supports registered users, while keeping guest playthrough parity as the earlier dependency.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Godot can represent authenticated player identity, display names, and session/match recovery state needed for auth PvP/PvB flows.
- [x] #2 A Godot auth PvP scenario reaches game-over or a documented equivalent deterministic replay path with structured parity artifacts.
- [x] #3 A Godot auth PvB scenario reaches game-over or a documented equivalent deterministic replay path with structured parity artifacts.
- [x] #4 Auth scenario artifacts include winner, score, match metadata, and screenshots comparable to browser/reference auth runs.
- [x] #5 Failure behavior for missing credentials or unavailable auth services is explicit and non-destructive.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Code builds without errors (pnpm build)
- [x] #2 Linting and typechecking pass (pnpm lint and pnpm typecheck)
- [x] #3 All unit and integration tests pass (pnpm test:run:all)
- [x] #4 API schemas and types are re-generated and verified (pnpm schema:gen and scripts/ci/verify-schema.sh)
- [x] #5 Documentation artifacts are updated (pnpm docs:artifacts)
- [x] #6 Automated verification scripts pass (FSM consistency and event log coverage)
<!-- DOD:END -->
