---
id: TASK-177
title: Restrict attacker selection to front row only
status: Done
assignee: []
created_date: '2026-04-04 12:00'
updated_date: '2026-04-06 02:13'
labels:
  - ui
  - safety
dependencies: []
references:
  - client/src/game.ts
  - >-
    backlog/decisions/decision-028 - DEC-2G-001 - Client UI-UX audit and
    remediation plan.md
priority: high
ordinal: 102000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The click handler for the player's occupied cells during `AttackPhase` at
`game.ts:181-183` calls `selectAttacker(pos)` for any occupied cell — no
`pos.row === 0` guard. The player can select a back-row card, see valid targets
light up in the opponent's column, and then the attack fails server-side.

This prevents illegal action paths in the primary action loop. The server
validates correctly, but the client should not allow the selection in the first
place (DEC-2G-001 finding F-14).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Only row-0 (front row) cards are clickable as attackers during `AttackPhase`
- [x] #2 Back-row card clicks do nothing (no `selectAttacker` call, no visual selection)
- [x] #3 The `pz-active-pulse` animation only applies to row-0 cards (already partially true)
- [x] #4 Existing attack flow for front-row cards is unchanged
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added `if (pos.row === 0)` guard around the `selectAttacker(pos)` click handler at `client/src/game.ts`. Back-row card clicks during AttackPhase now do nothing — no selection, no illegal action path to the server. Front-row attack flow unchanged. New test asserts `selectAttacker` mock is not called on a row-1 click. Commit: 02adb741.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 `pos.row === 0` guard added to attacker selection click handler
- [x] #2 New test: back-row click does not call `selectAttacker()`
- [x] #3 `pnpm -r test` passes
- [x] #4 `pnpm qa:api:run` succeeds
- [x] #5 `pnpm qa:playthrough:run` succeeds
- [x] #6 No existing tests broken
<!-- DOD:END -->
