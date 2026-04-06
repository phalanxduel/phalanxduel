---
id: TASK-196
title: >-
  Fix: Back-rank Ace destroyed by Ace attacker — targetIndex==0 check missing in
  aceVsAce path
status: To Do
assignee: []
created_date: '2026-04-06 15:22'
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
  - docs/RULES.md §10
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
- [ ] #1 Ace attacker with carryover vs back-rank Ace: back-rank Ace is NOT destroyed
- [ ] #2 Ace attacker vs front-rank Ace: front-rank Ace IS destroyed (existing aceVsAce behavior preserved)
- [ ] #3 Number attacker vs back-rank Ace: back-rank Ace is NOT destroyed (existing behavior preserved)
- [ ] #4 New regression test: ace-vs-ace at back rank — invulnerability holds
- [ ] #5 All existing Ace tests still pass
<!-- AC:END -->
