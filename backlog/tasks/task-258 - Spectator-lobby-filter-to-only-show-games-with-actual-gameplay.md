---
id: TASK-258
title: 'Spectator lobby: filter to only show games with actual gameplay'
status: To Do
assignee: []
created_date: '2026-05-02 08:05'
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
- [ ] #1 Spectator lobby only shows matches where status is 'active' or there is at least one completed turn
- [ ] #2 Waiting matches with no game state are excluded from the default view
- [ ] #3 pnpm check passes
<!-- AC:END -->
