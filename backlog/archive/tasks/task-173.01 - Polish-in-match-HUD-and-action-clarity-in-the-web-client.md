---
id: TASK-173.01
title: Polish in-match HUD and action clarity in the web client
status: Done
assignee:
  - '@codex'
created_date: '2026-04-03 04:44'
updated_date: '2026-04-05 01:21'
labels: []
dependencies: []
documentation:
  - client/src/game-preact.tsx
  - client/src/style.css
  - docs/gameplay/rules.md
parent_task_id: TASK-173
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Improve the active gameplay HUD so players can read turn ownership, current phase, and next available action with less effort. Focus on visual hierarchy, selected-card guidance, and contextual hints that make the board teach the next step without altering game rules or combat logic.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The in-match HUD presents phase and turn ownership with stronger visual clarity than the current text-only treatment.
- [x] #2 When the player has selected an attacker or deployable card, the UI provides contextual guidance for the next legal step instead of relying only on implicit board affordances.
- [x] #3 The changes preserve spectator safety, do not leak hidden information, and keep existing gameplay actions and controls intact.
- [x] #4 Targeted client verification covers the touched gameplay surface and documents the result.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Build a multi-line info bar with highlighted phase, turn indicator, and expanding status chips so ownership reads instantly.
2. Surface contextual hints for selected attacker/deploy cards so the board narrates the next legal move.
3. Keep the combat actions grouped with the new HUD while preserving spectator-safe behavior and help access.
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Polished in-match HUD and action clarity in the web client.
- Implemented a multi-line InfoBar with clear visual hierarchy for phase and turn.
- Added human-readable phase labels ('Combat Phase', 'Deploy Units', etc.).
- Refined action hints to provide contextual guidance based on selection (e.g., 'Choose column to reinforce').
- Integrated combat actions with the new HUD layout while preserving spectator safety.
- Verified with typechecking and unit tests.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 In-match HUD polished with multi-line layout and contextual hints.
- [x] #2 Phase labels and turn indicators are human-readable.
- [x] #3 All tests and typechecking pass.
- [ ] #4 In-match HUD polished with multi-line layout and contextual hints.
- [ ] #5 Phase labels and turn indicators are human-readable.
- [ ] #6 All tests and typechecking pass.
<!-- DOD:END -->
