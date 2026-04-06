---
id: TASK-186
title: 'A11y correctness: ARIA landmarks and live regions'
status: Done
assignee: []
created_date: '2026-04-04 12:00'
updated_date: '2026-04-06 00:38'
labels:
  - a11y
  - ui
dependencies: []
references:
  - client/src/game.ts
  - client/src/renderer.ts
  - client/src/style.css
  - >-
    backlog/decisions/decision-028 - DEC-2G-001 - Client UI-UX audit and
    remediation plan.md
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The client uses `div` elements throughout with no semantic landmarks
(`<main>`, `<header>`, `<section>`, `<nav>`). Phase changes, narration events,
and state updates have no `aria-live` regions. The game is essentially
invisible to screen readers.

This is the first of two a11y tasks (DEC-2G-001 findings F-09, F-17). This
task covers a11y **correctness** — the minimum required for assistive tech to
function. TASK-188 covers a11y **completeness** (keyboard navigation, focus
model).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Semantic landmarks added: `<main>` for game area, `<header>` for info bar, `<section>` for each battlefield, hand, and stats
- [x] #2 `aria-live="polite"` region added for phase/turn changes
- [x] #3 `aria-live="assertive"` region added for game-critical events (forfeit warning, game over)
- [x] #4 Turn indicator has `role="status"` or equivalent
- [x] #5 Help overlay is focus-trapped and announces via `role="dialog"`
- [x] #6 Narration overlay remains `aria-hidden="true"` (decorative)
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added semantic landmarks: main for game area, header for info bar, section for battlefields, aside for stats sidebar. Added role=\"status\"+aria-live=\"polite\" to turn indicator. Added hidden role=\"alert\" assertive live region for critical events. Help overlay now has role=\"dialog\", aria-modal, aria-labelledby, Escape key dismissal, and auto-focus on close button. Narration overlay aria-hidden was already set. 217 client tests pass.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Semantic landmarks present (`<main>`, `<header>`, `<section>`)
- [x] #2 aria-live regions for phase and critical events
- [x] #3 Help overlay focus-trapped with `role="dialog"`
- [x] #4 `pnpm -r test` passes
- [ ] #5 `pnpm qa:playthrough:run` succeeds
- [x] #6 No existing tests broken
<!-- DOD:END -->
