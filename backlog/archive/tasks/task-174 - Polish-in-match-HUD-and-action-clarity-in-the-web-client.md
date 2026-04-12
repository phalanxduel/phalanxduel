---
id: TASK-174
title: Polish in-match HUD and action clarity in the web client
status: To Do
assignee: []
created_date: '2026-04-03 04:41'
labels: []
dependencies: []
documentation:
  - client/src/game-preact.tsx
  - client/src/style.css
  - docs/gameplay/rules.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Improve the active gameplay HUD so players can read turn ownership, current phase, and next available action with less effort. Focus on visual hierarchy, selected-card guidance, and contextual hints that make the board teach the next step without altering game rules or combat logic.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The in-match HUD presents phase and turn ownership with stronger visual clarity than the current text-only treatment.
- [ ] #2 When the player has selected an attacker or deployable card, the UI provides contextual guidance for the next legal step instead of relying only on implicit board affordances.
- [ ] #3 The changes preserve spectator safety, do not leak hidden information, and keep existing gameplay actions and controls intact.
- [ ] #4 Targeted client verification covers the touched gameplay surface and documents the result.
<!-- AC:END -->
