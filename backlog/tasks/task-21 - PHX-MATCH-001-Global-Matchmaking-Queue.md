---
id: TASK-21
title: 'PHX-MATCH-001: Global Matchmaking Queue'
status: To Do
assignee: []
created_date: ''
updated_date: '2026-03-12 13:36'
labels: []
dependencies:
  - TASK-20
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
- Server-side `MatchmakingManager` to hold waiting players.
- Logic to pair players within a specific ELO delta (e.g., ±100).
- WebSocket signal to clients when a match is found.
<!-- SECTION:DESCRIPTION:END -->
