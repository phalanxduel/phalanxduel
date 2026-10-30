---
id: TASK-22
title: Ranked Lobby Leaderboards
status: Done
assignee: []
created_date: ''
updated_date: '2026-03-15 19:59'
labels: []
dependencies:
  - TASK-20
priority: medium
ordinal: 13000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Players need a visible ranked surface that turns Elo snapshots into something
worth competing for. This task is complete: the server exposes ladder endpoints
and the lobby renders category-specific leaderboards for PvP and bot ladders.

## Historical Outcome

Given a player opens the lobby, when the leaderboard section loads, then the UI
can fetch ranked data by category and display current standings with wins,
losses, and Elo.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Given a valid ladder category, when `/api/ladder/:category` is requested,
  then the server returns ranked entries enriched with gamertags and Elo data.
- [x] #2 Given the lobby leaderboard tabs, when a player switches categories, then
  the client fetches and renders the corresponding standings.
- [x] #3 Given no ranked players exist for a category, when the leaderboard loads,
  then the UI renders a clear empty state instead of failing silently.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- `server/src/routes/ladder.ts` serves leaderboard and player ladder data.
- `client/src/lobby.ts` renders category tabs and leaderboard tables.
- `client/src/style.css` contains leaderboard-specific styling.

## Verification

- `pnpm -C server test -- ladder.test.ts`
<!-- SECTION:NOTES:END -->
