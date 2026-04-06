---
id: TASK-176
title: Fix front-row pulse to include all suits
status: Done
assignee: []
created_date: '2026-04-04 12:00'
updated_date: '2026-04-06 02:12'
labels:
  - ui
  - clarity
dependencies: []
references:
  - client/src/game.ts
  - client/src/cards.ts
  - >-
    backlog/decisions/decision-028 - DEC-2G-001 - Client UI-UX audit and
    remediation plan.md
priority: high
ordinal: 101000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
`pz-active-pulse` at `game.ts:168` is gated by `isWeapon(bCard.card.suit)`,
which only returns true for spades and clubs. Hearts and diamonds at row 0 are
also valid attackers but do not pulse.

This misleads players into thinking only spades/clubs can attack from the front
row (DEC-2G-001 finding F-08).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 All front-row (row 0) cards receive `pz-active-pulse` during `AttackPhase` when it is the player's turn
- [x] #2 The `isWeapon()` check is removed from the pulse condition (keep it only for x2 badge logic)
- [x] #3 Back-row cards still do not pulse
- [x] #4 Existing animation timing and CSS are unchanged
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Removed `isWeapon(bCard.card.suit)` from the pulse condition at `client/src/game.ts:175`. Now all front-row (row 0) cards receive `pz-active-pulse` during AttackPhase, matching actual game rules. The `isWeapon` check is retained for the x2 badge logic at line 131-136. Tests updated: renamed existing spades pulse test, added hearts pulse case, added back-row no-pulse case. Commit: 02adb741.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 `isWeapon` guard removed from pulse logic at `game.ts:168`
- [x] #2 Pulse applies to all suits at row 0 during AttackPhase
- [x] #3 Tests updated
- [x] #4 `pnpm -r test` passes
- [x] #5 `pnpm qa:playthrough:run` succeeds
- [x] #6 No existing tests broken
<!-- DOD:END -->
