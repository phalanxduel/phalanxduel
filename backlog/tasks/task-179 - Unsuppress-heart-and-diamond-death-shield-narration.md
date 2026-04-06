---
id: TASK-179
title: Unsuppress heart and diamond death shield narration
status: Done
assignee: []
created_date: '2026-04-04 12:00'
updated_date: '2026-04-06 00:35'
labels:
  - ui
  - clarity
dependencies: []
references:
  - client/src/narration-producer.ts
  - client/src/narration-overlay.ts
  - >-
    backlog/decisions/decision-028 - DEC-2G-001 - Client UI-UX audit and
    remediation plan.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
`heartDeathShield` and `diamondDeathShield` are in `SUPPRESSED_BONUSES` at
`narration-producer.ts:46-50`. These are 2 of 4 suit boundary effects. When
either activates, the player sees damage reduced but gets no narration
explaining why.

All 4 suit boundary effects must produce narration so the player can
understand combat resolution causality (DEC-2G-001 finding F-05).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 `heartDeathShield` removed from `SUPPRESSED_BONUSES`
- [x] #2 `diamondDeathShield` removed from `SUPPRESSED_BONUSES`
- [x] #3 New narration messages added to `BONUS_MESSAGES`:
  - heartDeathShield → e.g., "{card}'s Heart Shield absorbs LP damage"
  - diamondDeathShield → e.g., "{card}'s Diamond Shield absorbs overflow"
- [x] #4 All 4 suit boundary effects now produce visible narration (club overflow, spade LP, heart shield, diamond shield)
- [x] #5 `faceCardIneligible` remains suppressed (intentional)
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Removed `heartDeathShield` and `diamondDeathShield` from `SUPPRESSED_BONUSES` in `narration-producer.ts`. Added `BONUS_MESSAGES` entries: `heartDeathShield` → `\"${card} survives — Heart Shield\"`, `diamondDeathShield` → `\"${card} survives — Diamond Shield\"`. Added two new tests asserting the new messages. All 218 client tests pass. `faceCardIneligible` remains the only suppressed bonus.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Both bonuses removed from SUPPRESSED_BONUSES
- [x] #2 BONUS_MESSAGES entries added for both
- [x] #3 Narration tests updated to assert new messages
- [x] #4 `pnpm -r test` passes
- [ ] #5 `pnpm qa:playthrough:run` succeeds
- [x] #6 No existing tests broken
<!-- DOD:END -->
