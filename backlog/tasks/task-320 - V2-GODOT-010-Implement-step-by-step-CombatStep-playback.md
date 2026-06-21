---
id: TASK-320
title: V2-GODOT-010 - Implement step-by-step CombatStep playback
status: Done
assignee: []
created_date: '2026-06-14 05:30'
labels: []
milestone: m-14
dependencies:
  - TASK-319
priority: medium
ordinal: 161000
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Combat engine exposes step-by-step CombatSteps
- [ ] #2 Godot plays through combat steps sequentially
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
