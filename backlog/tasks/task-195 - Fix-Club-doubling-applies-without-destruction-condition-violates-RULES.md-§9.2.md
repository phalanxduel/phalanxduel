---
id: TASK-195
title: >-
  Fix: Club doubling applies without destruction condition (violates RULES.md
  §9.2)
status: To Do
assignee: []
created_date: '2026-04-06 15:21'
labels:
  - qa
  - engine
  - rules
  - p1
  - correctness
dependencies: []
references:
  - 'engine/src/combat.ts:123-128'
  - 'engine/tests/rules-coverage.test.ts:513-577'
  - docs/RULES.md §9.2
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Problem

`engine/src/combat.ts:123-128` applies Club (♣) doubling whenever a back card exists and the attacker is Clubs, regardless of whether the front card was destroyed. RULES.md §9.2 specifies:

> Club applies only at "the first card→card boundary after first destruction."

If the front card survives (e.g., Club attacker value 10 vs front card value 20, overflow > 0 but front card survives), the Club doubling must NOT apply. The current code doubles overflow unconditionally when `backCard && attacker.card.suit === 'clubs'`.

## Evidence

- `combat.ts:123-128`: no destruction guard before `overflow *= 2`
- RULES.md §9.2: "boundary is first after first destruction"
- Existing test (`rules-coverage.test.ts:513-577`) only tests Club when front IS destroyed — does not test the no-destruction case

## Expected behavior

Club doubling at the card→card boundary only fires if at least one card in the target chain has been destroyed before reaching that boundary. If the front card absorbs damage and survives, Club does not double.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Club attacker, front card survives (partial damage): overflow is NOT doubled
- [ ] #2 Club attacker, front card destroyed: overflow IS doubled at card→card boundary (existing behavior preserved)
- [ ] #3 Club applies at most once per attack (clubDoubled flag unchanged)
- [ ] #4 New test: Club attacker with surviving front card — no doubling
- [ ] #5 All existing Club tests still pass
<!-- AC:END -->
