---
id: TASK-196
title: >-
  Fix: Back-rank Ace destroyed by Ace attacker — targetIndex==0 check missing in
  aceVsAce path
status: Done
assignee: []
created_date: '2026-04-06 15:22'
updated_date: '2026-04-07 13:35'
labels:
  - qa
  - engine
  - rules
  - p1
  - correctness
dependencies: []
references:
  - 'engine/src/combat.ts:262-289'
  - 'engine/tests/rules-coverage.test.ts:199-263'
  - docs/gameplay/rules.md §10
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Problem

`engine/src/combat.ts:262-289` handles the Ace-vs-Ace invulnerability override but does not check `isFrontRow`. RULES.md §10 states:

> "Ace destroyed only if: attacker.type == ace AND targetIndex == 0"

The `targetIndex == 0` requirement means the Ace must be in the front row (rank 0). A back-rank Ace should be invulnerable even against an Ace attacker. The implementation passes `isFrontRow` into `absorbDamage` for normal Ace invulnerability (lines 100, 148) but the `aceVsAce` branch at line 262 does not check `isFrontRow`, allowing an Ace attacker with carryover to destroy a back-rank Ace.

## Evidence

- `combat.ts:262-289`: aceVsAce path lacks `isFrontRow` guard
- `rules-coverage.test.ts:199-263`: tests back-rank Ace against a NUMBER attacker, not against an Ace attacker
- RULES.md §10: "targetIndex == 0" is an explicit requirement

## Expected behavior

Ace attacker vs back-rank Ace: back-rank Ace is NOT destroyed. Ace invulnerability applies regardless of attacker type when the Ace is not in the front row (targetIndex != 0).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Ace attacker with carryover vs back-rank Ace: back-rank Ace is NOT destroyed
- [x] #2 Ace attacker vs front-rank Ace: front-rank Ace IS destroyed (existing aceVsAce behavior preserved)
- [x] #3 Number attacker vs back-rank Ace: back-rank Ace is NOT destroyed (existing behavior preserved)
- [x] #4 New regression test: ace-vs-ace at back rank — invulnerability holds
- [x] #5 All existing Ace tests still pass
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Already fixed. combat.ts:263 checks `if (attackerIsAce && isFrontRow)` — back-rank aces never enter the aceVsAce destruction path. They fall through to normal ace invulnerability (line 291). No code changes needed.
<!-- SECTION:FINAL_SUMMARY:END -->
