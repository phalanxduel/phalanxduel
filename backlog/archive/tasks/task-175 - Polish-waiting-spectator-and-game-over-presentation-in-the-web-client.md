---
id: TASK-175
title: 'Polish waiting, spectator, and game-over presentation in the web client'
status: To Do
assignee: []
created_date: '2026-04-03 04:42'
labels: []
dependencies: []
documentation:
  - client/src/waiting-preact.tsx
  - client/src/game-over.ts
  - client/src/game-preact.tsx
  - client/src/style.css
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Improve the non-combat presentation layers of the browser client so invite flow, spectating, and match completion feel intentional and game-native. Focus on waiting-room copy/hierarchy, spectator-state differentiation, and stronger game-over outcome presentation.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The waiting room communicates play-vs-watch invites more clearly and feels more ceremonial than the current utility-first presentation.
- [ ] #2 Spectator mode is visually distinguishable from player mode in a way that improves comprehension without cluttering gameplay.
- [ ] #3 The game-over view more clearly communicates outcome tone and victory reason while preserving the canonical result details.
- [ ] #4 Targeted client verification covers the touched waiting/spectator/game-over surfaces and documents the result.
<!-- AC:END -->
