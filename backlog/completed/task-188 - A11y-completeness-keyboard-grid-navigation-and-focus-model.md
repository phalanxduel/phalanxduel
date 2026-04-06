---
id: TASK-188
title: 'A11y completeness: keyboard grid navigation and focus model'
status: Done
assignee: []
created_date: '2026-04-04 12:00'
updated_date: '2026-04-06 00:30'
labels:
  - a11y
  - ui
dependencies:
  - TASK-186
references:
  - client/src/game.ts
  - client/src/renderer.ts
  - >-
    backlog/decisions/decision-028 - DEC-2G-001 - Client UI-UX audit and
    remediation plan.md
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The game has no keyboard interaction: no `tabindex`, no arrow-key grid
navigation, no Enter to confirm, no focus management. The game is mouse/touch
only.

This is the second of two a11y tasks (DEC-2G-001 finding F-09). Depends on
TASK-186 (landmarks and live regions) which establishes the semantic structure
that keyboard navigation builds on.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Battlefield cells are keyboard-navigable (arrow keys move focus within the grid)
- [ ] #2 Enter/Space confirms selection (select attacker, select target, deploy, reinforce)
- [ ] #3 Hand cards are tabbable and selectable via keyboard
- [ ] #4 Action buttons (Pass, Forfeit, Cancel, Help) are keyboard-accessible
- [ ] #5 Focus is managed on phase transitions (focus moves to actionable area)
- [ ] #6 Visible focus indicator on all interactive elements
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added keyboard navigation throughout the game UI: bf-cell elements get tabindex=0 with arrow key navigation within each grid, Enter/Space activates any interactive cell (select attacker, attack target, deploy, reinforce). Playable hand cards get tabindex=0 with Enter/Space selection. restoreFocus() helper auto-focuses the most relevant element after each re-render. :focus-visible outlines added for bf-cell and hand-card.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Keyboard navigation works for all game interactions (battlefield, hand, buttons)
- [ ] #2 Focus management on phase transitions (focus moves to actionable area)
- [ ] #3 Visible focus indicators on all interactive elements
- [ ] #4 `pnpm -r test` passes
- [ ] #5 `pnpm qa:playthrough:run` succeeds
- [ ] #6 No existing tests broken
<!-- DOD:END -->
