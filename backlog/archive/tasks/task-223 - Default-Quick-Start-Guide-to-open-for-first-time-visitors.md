---
id: TASK-223
title: Default Quick Start Guide to open for first-time visitors
status: Done
assignee: []
created_date: '2026-04-07 02:57'
updated_date: '2026-05-01 01:31'
labels:
  - client
  - ux
  - p1
  - promotion-readiness
milestone: m-5
dependencies:
  - TASK-211
references:
  - client/src/lobby-preact.tsx
priority: high
ordinal: 1020
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The lobby Quick Start Guide is collapsed by default. First-time players do not discover it. Default helpOpen to true on first visit using a localStorage flag. Return visitors keep their toggle state.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 First visit to play.phalanxduel.com shows Quick Start Guide expanded
- [x] #2 Return visits respect the users previous toggle state via localStorage
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Changed helpOpen initial state in lobby.tsx to read localStorage key 'phx:helpOpen' — first visit (null) defaults to true, return visits use the stored value. Replaced direct setHelpOpen calls with setHelpOpenPersist which both updates state and persists to localStorage. The ? button and close handler both call setHelpOpenPersist.
<!-- SECTION:FINAL_SUMMARY:END -->
