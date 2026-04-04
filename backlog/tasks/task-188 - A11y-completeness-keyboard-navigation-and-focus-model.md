---
id: TASK-188
title: 'A11y completeness: keyboard grid navigation and focus model'
status: Planned
assignee: []
created_date: '2026-04-04 12:00'
labels:
  - a11y
  - ui
dependencies:
  - TASK-186
references:
  - client/src/game.ts
  - client/src/renderer.ts
  - backlog/decisions/decision-028 - DEC-2G-001 - Client UI-UX audit and remediation plan.md
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

## Verification

```bash
pnpm --filter @phalanxduel/client test
# Expected: all tests pass

pnpm -r test
# Expected: no regressions
```

## QA Impact

Keyboard navigation adds `tabindex` and `keydown` handlers. QA bots use
Playwright click actions which should not be affected by keyboard event
listeners. Verify that added `tabindex` does not interfere with Playwright's
element targeting.

## Changelog

```markdown
### Added
- **Keyboard Controls**: You can now play the entire game without a mouse.
  Arrow keys navigate the battlefield grid, Enter/Space confirm selections,
  and Tab cycles through hand cards and action buttons. Focus indicators show
  which element is selected.
```

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] Keyboard navigation works for all game interactions (battlefield, hand, buttons)
- [ ] Focus management on phase transitions (focus moves to actionable area)
- [ ] Visible focus indicators on all interactive elements
- [ ] `pnpm -r test` passes
- [ ] `pnpm qa:playthrough:run` succeeds
- [ ] No existing tests broken
<!-- DOD:END -->
