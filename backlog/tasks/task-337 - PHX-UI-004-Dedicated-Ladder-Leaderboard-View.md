---
id: TASK-337
title: PHX-UI-004 - Dedicated Ladder & Leaderboard View
status: To Do
assignee: []
created_date: '2026-07-01 01:18'
labels:
  - ranked
dependencies:
  - TASK-335
ordinal: 179800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Build a highly engaging, visually rich global leaderboard UI. Display top ELO rankings, player streaks, and active seasonal ladders so there's a tangible sense of progression and community on the site.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A new Leaderboard / Ladder tab or modal is available. It displays paginated/top 100 global ELO rankings.
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
