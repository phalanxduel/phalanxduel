---
id: TASK-186
title: 'A11y correctness: ARIA landmarks and live regions'
status: Planned
assignee: []
created_date: '2026-04-04 12:00'
labels:
  - a11y
  - ui
dependencies: []
references:
  - client/src/game.ts
  - client/src/renderer.ts
  - client/src/style.css
  - backlog/decisions/decision-028 - DEC-2G-001 - Client UI-UX audit and remediation plan.md
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
- [ ] #1 Semantic landmarks added: `<main>` for game area, `<header>` for info bar, `<section>` for each battlefield, hand, and stats
- [ ] #2 `aria-live="polite"` region added for phase/turn changes
- [ ] #3 `aria-live="assertive"` region added for game-critical events (forfeit warning, game over)
- [ ] #4 Turn indicator has `role="status"` or equivalent
- [ ] #5 Help overlay is focus-trapped and announces via `role="dialog"`
- [ ] #6 Narration overlay remains `aria-hidden="true"` (decorative)
<!-- AC:END -->

## Verification

```bash
pnpm --filter @phalanxduel/client test
# Expected: all tests pass

pnpm -r test
# Expected: no regressions
```

## QA Impact

Changing `div` to semantic elements (`<main>`, `<section>`, etc.) should not
affect QA selectors which use `data-testid` and CSS classes. However, verify
that no QA script uses bare `div` tag selectors. Adding `aria-live` regions
is purely additive.

## Changelog

```markdown
### Added
- **Screen Reader Support**: The game board now uses proper HTML landmarks
  and announces phase changes, turn ownership, and game-critical events to
  assistive technology. Players using screen readers can follow game state
  transitions for the first time.
```

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] Semantic landmarks present (`<main>`, `<header>`, `<section>`)
- [ ] aria-live regions for phase and critical events
- [ ] Help overlay focus-trapped with `role="dialog"`
- [ ] `pnpm -r test` passes
- [ ] `pnpm qa:playthrough:run` succeeds
- [ ] No existing tests broken
<!-- DOD:END -->
