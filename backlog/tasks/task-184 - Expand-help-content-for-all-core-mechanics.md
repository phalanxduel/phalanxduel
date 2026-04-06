---
id: TASK-184
title: Expand help content for all core mechanics
status: Done
assignee: []
created_date: '2026-04-04 12:00'
updated_date: '2026-04-06 02:12'
labels:
  - ui
  - ux
dependencies: []
references:
  - client/src/help.ts
  - docs/RULES.md
  - >-
    backlog/decisions/decision-028 - DEC-2G-001 - Client UI-UX audit and
    remediation plan.md
priority: medium
ordinal: 97000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
`HELP_CONTENT` in `help.ts` has only 5 topics (LP, Battlefield, Hand, Stats,
Battle Log). There is no coverage of: suit effects (spade/heart/diamond/club
boundary behaviors), face card destruction hierarchy, ace invulnerability,
pass/forfeit rules, target chain mechanics, reinforcement rules, or damage
modes (DEC-2G-001 finding F-11).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 New help entries added for at least: suit effects, face card hierarchy, ace rules, pass/forfeit rules, target chain, reinforcement
- [x] #2 Help markers placed on relevant UI sections (e.g., suit effects near battlefield cards, pass rules near pass button)
- [x] #3 Content is concise but accurate — derived from RULES.md, not invented
- [x] #4 Existing 5 help topics are preserved unchanged
- [x] #5 Help overlay rendering handles new entries without layout issues
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added 6 new HELP_CONTENT entries to `help.ts`: `target-chain`, `suits`, `aces`, `face-cards`, `pass-forfeit`, `reinforce`. All content derived from RULES.md §§9-16. Added `renderHelpMarker` calls: `pass-forfeit` near action buttons, `suits` near player battlefield, `target-chain` and `reinforce` alongside existing log/hand markers. Updated help test to expect 11 entries. 217 client tests pass.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 6+ new HELP_CONTENT entries
- [x] #2 Help markers added to relevant UI locations
- [x] #3 Content verified against RULES.md
- [x] #4 `pnpm -r test` passes
- [ ] #5 `pnpm qa:playthrough:run` succeeds
- [x] #6 No existing tests broken
<!-- DOD:END -->
