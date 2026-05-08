---
id: TASK-MEDIUM.01
title: 'Deepen Bot Participation Seam: Encapsulate Bot Orchestration in MatchActor'
status: Done
assignee: []
created_date: '2026-05-05 20:07'
updated_date: '2026-05-06 01:10'
labels: []
milestone: m-8
dependencies:
  - TASK-MEDIUM.02
parent_task_id: TASK-MEDIUM
priority: high
ordinal: 132000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Push bot orchestration entirely behind the MatchActor seam. The MatchActor should detect when the activePlayerIndex shifts to the bot, internally generate the action, and resolve it, rather than requiring the LocalMatchManager to schedule and dispatch it.
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code builds without errors (pnpm build)
- [ ] #2 Linting and typechecking pass (pnpm lint and pnpm typecheck)
- [ ] #3 All unit and integration tests pass (pnpm test:run:all)
- [ ] #4 API schemas and types are re-generated and verified (pnpm schema:gen and scripts/ci/verify-schema.sh)
- [ ] #5 Documentation artifacts are updated (pnpm docs:artifacts)
- [ ] #6 Automated verification scripts pass (FSM consistency and event log coverage)
<!-- DOD:END -->
