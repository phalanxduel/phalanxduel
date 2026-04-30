---
id: TASK-223
title: Default Quick Start Guide to open for first-time visitors
status: To Do
assignee: []
created_date: '2026-04-07 02:57'
updated_date: '2026-04-30 22:17'
labels:
  - client
  - ux
  - p1
  - promotion-readiness
milestone: m-4
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
- [ ] #1 First visit to play.phalanxduel.com shows Quick Start Guide expanded
- [ ] #2 Return visits respect the users previous toggle state via localStorage
<!-- AC:END -->
