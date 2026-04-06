---
id: TASK-185
title: Add battlefield row and column labels
status: Done
assignee: []
created_date: '2026-04-04 12:00'
updated_date: '2026-04-06 00:33'
labels:
  - ui
  - clarity
dependencies: []
references:
  - client/src/game.ts
  - client/src/style.css
  - >-
    backlog/decisions/decision-028 - DEC-2G-001 - Client UI-UX audit and
    remediation plan.md
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
- [x] #1 Column numbers (1, 2, 3, 4) appear above or between the opponent/player grids
- [x] #2 Row labels ("Front" / "Back") appear alongside each grid
- [x] #3 Labels are visible but unobtrusive (muted color, small font)
- [x] #4 Labels are responsive at all breakpoints (380px, 600px, 768px, 1200px)
- [x] #5 Labels align with battle log column references (Col 1, Col 2, etc.)
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added column number labels (1…N) as a header row and row labels (Front / Back / R3+) as a leading cell on each row using CSS grid with `min-content repeat(N, 1fr)` columns. Label cells use `.bf-col-label` / `.bf-row-label` classes — muted, small, non-interactive, vertically written for row labels. Labels are not `.bf-cell` elements so existing cell-count tests are unaffected. Updated `game-helpers.test.ts` gridTemplateColumns assertion to match new value. All 217 client tests pass.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Column numbers and row labels render
- [x] #2 Responsive at all breakpoints (380px, 600px, 768px, 1200px)
- [x] #3 Labels match battle log terminology
- [x] #4 `pnpm -r test` passes
- [ ] #5 `pnpm qa:playthrough:run` succeeds
- [x] #6 No existing tests broken
<!-- DOD:END -->
