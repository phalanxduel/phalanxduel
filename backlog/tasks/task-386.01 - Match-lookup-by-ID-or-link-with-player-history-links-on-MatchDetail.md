---
id: TASK-386.01
title: 'Match lookup by ID or link, with player history links on MatchDetail'
status: To Do
assignee: []
created_date: '2026-09-04 14:25'
labels:
  - admin
  - ops
dependencies: []
documentation:
  - admin/src/client/main.tsx
  - admin/src/client/pages/Dashboard.tsx
  - admin/src/client/pages/MatchDetail.tsx
  - admin/src/client/pages/UserDetail.tsx
  - client/src/waiting.tsx
parent_task_id: TASK-386
priority: high
type: feature
ordinal: 261800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
First slice of TASK-386. Add a single input on the admin Dashboard that accepts a bare match ID, an admin match link (`#/matches/<id>`), or a player/spectator link carrying `?match=<id>` (see `client/src/waiting.tsx`), and navigates straight to that match's MatchDetail view. Separately, MatchDetail currently has no links to either player's history — add them so a pasted match ID becomes a jumping-off point for the players in it, not a dead end.

Confirmed today: admin routing is hash-based in `admin/src/client/main.tsx` (`#/matches/<matchId>` -> MatchDetail, `#/users/<userId>` -> UserDetail). `MatchDetail.tsx` has no reference to UserDetail or a player user ID today — grep for `UserDetail`/`userId` in that file returns nothing.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Pasting a bare match UUID into the lookup input navigates to that match's MatchDetail view
- [ ] #2 Pasting an admin match link or a player/spectator link containing the match ID does the same (the ID is parsed out of the URL, not just accepted as a raw string)
- [ ] #3 An invalid or not-found ID shows a clear inline error instead of a blank or broken page
- [ ] #4 MatchDetail links out to both players' UserDetail pages
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
