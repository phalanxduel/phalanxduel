---
id: TASK-333
title: PHX-TAXONOMY-002 - Expand Component Taxonomy to non-game views
status: To Do
assignee: []
created_date: '2026-06-30 21:52'
labels: []
dependencies: []
ordinal: 175800
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Apply semantic data-component attributes to LeaderboardView, MatchHistory, and AchievementViews
- [ ] #2 Automation selectors are updated to use the new taxonomy
- [ ] #3 Document the new contracts in ui_component_taxonomy.md
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
