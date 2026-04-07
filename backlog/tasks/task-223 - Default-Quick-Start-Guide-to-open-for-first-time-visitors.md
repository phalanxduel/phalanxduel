---
id: TASK-223
title: Default Quick Start Guide to open for first-time visitors
status: To Do
assignee: []
created_date: '2026-04-07 02:57'
labels:
  - client
  - ux
  - p1
  - promotion-readiness
dependencies:
  - TASK-211
references:
  - client/src/lobby-preact.tsx
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The lobby Quick Start Guide is collapsed by default. First-time players do not discover it. Default helpOpen to true on first visit using a localStorage flag. Return visitors keep their toggle state.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 First visit to play.phalanxduel.com shows Quick Start Guide expanded
- [ ] #2 Return visits respect the users previous toggle state via localStorage
<!-- AC:END -->
