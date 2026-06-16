---
id: TASK-328.14
title: V2-GODOT-030 - Godot auth PvP and auth PvB scenario parity
status: Backlog
assignee: []
created_date: '2026-06-16 01:20'
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
- [ ] #1 Godot can represent authenticated player identity, display names, and session/match recovery state needed for auth PvP/PvB flows.
- [ ] #2 A Godot auth PvP scenario reaches game-over or a documented equivalent deterministic replay path with structured parity artifacts.
- [ ] #3 A Godot auth PvB scenario reaches game-over or a documented equivalent deterministic replay path with structured parity artifacts.
- [ ] #4 Auth scenario artifacts include winner, score, match metadata, and screenshots comparable to browser/reference auth runs.
- [ ] #5 Failure behavior for missing credentials or unavailable auth services is explicit and non-destructive.
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
