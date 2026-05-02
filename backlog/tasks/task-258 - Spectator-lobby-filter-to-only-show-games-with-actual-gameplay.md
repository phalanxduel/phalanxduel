---
id: TASK-258
title: 'Spectator lobby: filter to only show games with actual gameplay'
status: Done
assignee: []
created_date: '2026-05-02 08:05'
updated_date: '2026-05-02 12:16'
labels:
  - client
  - spectator
  - ux
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The spectator lobby lists all matches including idle/waiting games that never had any turns. Users only care about active or completed games. Filter the list to exclude matches where no gameplay occurred.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Spectator lobby only shows matches where status is 'active' or there is at least one completed turn
- [x] #2 Waiting matches with no game state are excluded from the default view
- [x] #3 pnpm check passes
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Changed default `statusFilter` from `'all'` to `'active'` in `SpectatorLobbyScreen`. Idle waiting matches (one player joined, no opponent, no gameplay) are now hidden by default. History section condition updated to show for all filters except `'waiting'` and `'has-moves'`, so rewatch history remains visible on the default active view. Fixed 6 pre-existing lint errors (no-misused-promises, no-floating-promises) in lobby.tsx. Updated test expectations. pnpm check passes.
<!-- SECTION:FINAL_SUMMARY:END -->
