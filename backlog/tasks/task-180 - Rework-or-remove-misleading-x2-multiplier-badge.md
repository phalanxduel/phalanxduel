---
id: TASK-180
title: Rework or remove misleading x2 multiplier badge
status: Done
assignee: []
created_date: '2026-04-04 12:00'
updated_date: '2026-04-06 00:36'
labels:
  - ui
  - clarity
dependencies: []
references:
  - client/src/game.ts
  - >-
    backlog/decisions/decision-028 - DEC-2G-001 - Client UI-UX audit and
    remediation plan.md
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The x2 multiplier badge at `game.ts:124-129` appears on ALL spade/club cards
on the player's battlefield regardless of row. Clubs only double overflow when
damage passes from a destroyed front card to a back card. Spades only double
when overflow reaches the defending player's LP. A badge on a back-row card, or
on a front-row card facing an empty opponent column, promises an effect that
will not trigger.

The badge looks like a promise, not a rule reminder. Per DEC-2G-001
implementation principle on badge semantics: badges must not promise effects
that may not trigger (finding F-06).

Two viable approaches:
- **Option A:** Remove the persistent x2 badge entirely; explain suit behavior
  in help or hover
- **Option B:** Replace with a generic suit-role marker (e.g., "ATK" stays but
  x2 is removed) that does not imply guaranteed activation
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The x2 badge no longer appears on cards where the effect cannot trigger
- [x] #2 If Option A: badge removed entirely; suit behavior explained in help content
- [ ] #3 If Option B: badge replaced with a non-promissory marker
- [x] #4 ATK/DEF type badges are unaffected (these are categorical, not conditional)
- [x] #5 No change to actual combat mechanics
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Option A: removed the x2 badge block entirely from `createBattlefieldCell` in `game.ts`. ATK/DEF badges are unaffected. Updated tests: merged the two x2 tests into one that asserts the badge is absent. 217 client tests pass. Suit behavior will be explained in TASK-184 help content.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 x2 badge no longer misleads about effect activation
- [x] #2 Option chosen and implemented consistently
- [x] #3 Tests updated
- [x] #4 `pnpm -r test` passes
- [ ] #5 `pnpm qa:playthrough:run` succeeds
- [x] #6 No existing tests broken
<!-- DOD:END -->
