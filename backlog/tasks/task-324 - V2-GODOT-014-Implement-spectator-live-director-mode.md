---
id: TASK-324
title: V2-GODOT-014 - Implement spectator live-director mode
status: Backlog
assignee: []
created_date: '2026-06-14 05:31'
updated_date: '2026-06-19 02:12'
labels: []
milestone: m-14
dependencies:
  - TASK-317
priority: low
ordinal: 165000
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Global match metadata prioritized
- [ ] #2 Play-by-play log feed implemented
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
