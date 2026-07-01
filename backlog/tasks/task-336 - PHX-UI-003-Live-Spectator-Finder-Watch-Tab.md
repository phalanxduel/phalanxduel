---
id: TASK-336
title: PHX-UI-003 - Live Spectator Finder & Watch Tab
status: Done
assignee: []
created_date: '2026-07-01 01:18'
updated_date: '2026-07-01 11:54'
labels:
  - spectator
dependencies:
  - TASK-334
ordinal: 178800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Expand the current OPEN_PUBLIC_MATCHES lobby to include a Live Matches section. Allow players to easily discover and jump into ongoing games as a spectator. Highlight high-ELO matches so players can learn from the best.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Lobby shows Live matches in progress. Clicking a live match joins it as a spectator.
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
