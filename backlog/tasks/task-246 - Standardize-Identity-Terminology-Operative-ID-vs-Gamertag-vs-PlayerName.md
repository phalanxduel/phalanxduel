---
id: TASK-246
title: Standardize Identity Terminology (Operative ID vs Gamertag vs PlayerName)
status: Planned
assignee: []
created_date: '2026-04-28 15:33'
labels: []
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Refactor and consolidate sprawling terminology: OPERATIVE_ID, gamertag, player_name, and the #suffix. Standardize on "Operative ID" for the user-facing identity string.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Public UI consistently uses "OPERATIVE_ID" for the formatted gamertag#suffix string.
- [ ] #2 Internal state clearly distinguishes between `gamertag` (raw), `suffix` (number), and `playerName` (transient/display).
- [ ] #3 Guest identification is explicitly labeled as "GUEST_OPERATIVE" or similar to avoid confusion with registered accounts.
<!-- AC:END -->
