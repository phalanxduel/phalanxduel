---
id: TASK-194
title: >-
  Fix: Hearts stack violation — front+back heart shields summed, must use
  lastDestroyedCard only
status: Done
assignee: []
created_date: '2026-04-06 15:20'
updated_date: '2026-04-07 13:31'
labels:
  - qa
  - engine
  - rules
  - p1
  - correctness
dependencies: []
references:
  - 'engine/src/combat.ts:110-113'
  - 'engine/src/combat.ts:183'
  - docs/RULES.md §9.3
  - docs/RULES.md §19
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Problem

`engine/src/combat.ts:183` computes `heartShield = frontHeartShield + backHeartShield`, summing both front and back heart values when both are destroyed in the same attack. RULES.md §9.3 and §19 (hard invariants) explicitly state: "Hearts do not stack."

The spec defines the heart shield as: if `lastDestroyedCard.suit == ♥` at the Card→Player boundary, reduce remaining by that card's value. Only the **last destroyed card** before the player boundary counts.

Additionally, `frontHeartShield` is gated on `!newBf[column + ctx.columns]` (no back card), which means if both front Heart and back card are destroyed, the front Heart shield is silently dropped — a second divergence from the `lastDestroyedCard` semantic.

## Evidence

- `combat.ts:183`: `const heartShield = frontHeartShield + backHeartShield`
- `combat.ts:110-113`: `frontHeartShield` only set when no back card exists
- RULES.md §9.3, §19: "Hearts do not stack" — hard invariant

## Expected behavior

Only the last card destroyed in the column before the player boundary applies a heart shield. This is always the back card if it is a Heart and is destroyed, or the front card if no back card exists and the front card is a Heart and is destroyed. The front card's heart value must NOT be added when the back card is also destroyed.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Two Hearts in same column both destroyed: only last-destroyed Heart value shields LP, not sum of both
- [x] #2 Front Heart destroyed, no back card: front Heart shields LP correctly
- [x] #3 Back Heart destroyed (front was not Heart): back Heart shields LP correctly
- [x] #4 Front Heart destroyed, back non-Heart also destroyed: no heart shield applied
- [x] #5 Hearts-do-not-stack invariant verified by dedicated test
- [x] #6 All existing combat tests still pass
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Already fixed. combat.ts:183 uses `backHeartShield > 0 ? backHeartShield : frontHeartShield` (ternary, not addition). Only the last-destroyed heart applies. frontHeartShield is only set when front card is destroyed (line 110-112), and backHeartShield takes priority when present. No stacking occurs. No code changes needed.
<!-- SECTION:FINAL_SUMMARY:END -->
