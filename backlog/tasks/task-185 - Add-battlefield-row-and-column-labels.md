---
id: TASK-185
title: Add battlefield row and column labels
status: Planned
assignee: []
created_date: '2026-04-04 12:00'
labels:
  - ui
  - clarity
dependencies: []
references:
  - client/src/game.ts
  - client/src/style.css
  - backlog/decisions/decision-028 - DEC-2G-001 - Client UI-UX audit and remediation plan.md
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The battlefield grid has no column numbers (1-4) or row labels ("Front" /
"Back"). Players cannot reference specific positions in conversation or when
reading the battle log (DEC-2G-001 finding F-12).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Column numbers (1, 2, 3, 4) appear above or between the opponent/player grids
- [ ] #2 Row labels ("Front" / "Back") appear alongside each grid
- [ ] #3 Labels are visible but unobtrusive (muted color, small font)
- [ ] #4 Labels are responsive at all breakpoints (380px, 600px, 768px, 1200px)
- [ ] #5 Labels align with battle log column references (Col 1, Col 2, etc.)
<!-- AC:END -->

## Verification

```bash
pnpm --filter @phalanxduel/client test
# Expected: all tests pass

pnpm -r test
# Expected: no regressions
```

## QA Impact

No QA automation changes expected. Labels are passive elements. QA bots
target cells via `[data-testid^="player-cell-"]` which is unaffected.

## Changelog

```markdown
### Added
- **Battlefield Labels**: Columns are now numbered (1–4) and rows labeled
  "Front" and "Back" on the battlefield grid. This matches the battle log
  references ("Col 1", "Front") so you can cross-reference combat events
  with positions on the board.
```

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] Column numbers and row labels render
- [ ] Responsive at all breakpoints (380px, 600px, 768px, 1200px)
- [ ] Labels match battle log terminology
- [ ] `pnpm -r test` passes
- [ ] `pnpm qa:playthrough:run` succeeds
- [ ] No existing tests broken
<!-- DOD:END -->
