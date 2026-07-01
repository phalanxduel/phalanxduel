---
id: TASK-335
title: PHX-UI-002 - Account Management & Player Profile Dashboard
status: Done
assignee:
  - '@antigravity'
created_date: '2026-07-01 01:18'
updated_date: '2026-07-01 01:25'
labels:
  - ui
dependencies:
  - TASK-334
ordinal: 177800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Expand the small OPERATIVE_PROFILE box into a rich, dedicated profile view. A place for players to view their full match history, lifetime stats, win/loss breakdowns, and manage their display names.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Profile modal/view exists. It displays Match History, ELO, Streak, and allows users to edit their gamertag.
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
