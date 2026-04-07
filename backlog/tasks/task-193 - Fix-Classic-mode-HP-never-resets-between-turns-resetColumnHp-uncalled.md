---
id: TASK-193
title: 'Fix: Classic mode HP never resets between turns (resetColumnHp uncalled)'
status: Done
assignee: []
created_date: '2026-04-06 15:19'
updated_date: '2026-04-07 13:30'
labels:
  - qa
  - engine
  - rules
  - p0
  - correctness
dependencies: []
references:
  - 'engine/src/combat.ts:347'
  - engine/src/turns.ts
  - docs/RULES.md §12
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Problem

`engine/src/combat.ts` exports `resetColumnHp` but it is never called anywhere in the turn lifecycle (`engine/src/turns.ts` has zero call sites). RULES.md §12 mandates: "Classic mode: No defense persists between turns."

Every card that survives combat retains its reduced HP into the next turn. Every Classic mode game silently runs as Cumulative — the most fundamental rules violation in the engine. All production Classic matches are played under incorrect rules.

## Evidence

- `engine/src/combat.ts:347` — `resetColumnHp` defined and exported, never called
- `engine/src/turns.ts` — zero call sites for `resetColumnHp`
- RULES.md §12: "Classic: No defense persists between turns"

## Expected behavior

At the correct point in the turn lifecycle (end of AttackResolution or start of CleanupPhase), in Classic mode, all cards in the defending player's attacked column that survived combat must have their HP restored to face value.

## Implementation notes

Call `resetColumnHp` from the turn lifecycle scoped to `!ctx.isCumulative`. Identify which player's column resets — the defending player's attacked column. Do not reset the attacker's column. Confirm the correct phase insertion point per RULES.md §12-13.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Classic mode: card surviving attack with reduced HP shows full HP at start of next turn
- [x] #2 Cumulative mode: card surviving attack retains reduced HP across turns (no regression)
- [x] #3 New regression test: Classic mode HP reset after attack resolution
- [x] #4 New regression test: Cumulative mode HP persistence across turns
- [x] #5 All existing engine tests still pass
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Already fixed. `applyClassicHpReset` in turns.ts:51-60 calls `resetColumnHp` at every EndTurn transition (lines 290, 449, 491, 518). Golden test at golden-scenarios.test.ts:238 and regression test at rules-coverage.test.ts:764 both verify classic HP reset and cumulative persistence. No code changes needed.
<!-- SECTION:FINAL_SUMMARY:END -->
