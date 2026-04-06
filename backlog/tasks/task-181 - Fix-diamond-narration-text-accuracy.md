---
id: TASK-181
title: Fix diamond narration text accuracy
status: Done
assignee: []
created_date: '2026-04-04 12:00'
updated_date: '2026-04-06 02:12'
labels:
  - ui
  - clarity
dependencies:
  - TASK-179
references:
  - client/src/narration-producer.ts
  - >-
    backlog/decisions/decision-028 - DEC-2G-001 - Client UI-UX audit and
    remediation plan.md
priority: medium
ordinal: 100000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
`diamondDoubleDefense` in `BONUS_MESSAGES` at `narration-producer.ts:42` says
"...halved by Diamond Defense". The actual mechanic is absorption:
`remaining = max(remaining - cardValue, 0)`, not halving. The narration gives
the player an incorrect understanding of the diamond mechanic.

Depends on TASK-179 (unsuppress shield narration) since both touch the
narration bonus system (DEC-2G-001 finding F-13).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 `diamondDoubleDefense` message updated to accurately describe absorption (e.g., "...absorbed by Diamond Shield")
- [x] #2 The text does not say "halved", "divided", or imply a fractional reduction
- [x] #3 Consistent wording style with other bonus messages
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Updated `diamondDoubleDefense` message in `BONUS_MESSAGES` from `'...halved by Diamond Defense'` to `'...absorbed by Diamond Defense'` to accurately reflect the absorption mechanic (`remaining = max(remaining - cardValue, 0)`). Updated the corresponding test assertion. Done alongside TASK-179.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Narration text matches actual mechanic (absorption, not halving)
- [x] #2 Tests updated
- [x] #3 `pnpm -r test` passes
- [x] #4 `pnpm qa:playthrough:run` succeeds
- [x] #5 No existing tests broken
<!-- DOD:END -->
