---
id: TASK-208
title: >-
  Fix: LP step absorbed field in combat log is circular — reflects final damage,
  not shield reduction
status: To Do
assignee: []
created_date: '2026-04-06 15:36'
updated_date: '2026-04-08 21:46'
labels:
  - qa
  - engine
  - p2
  - audit-trail
dependencies: []
references:
  - 'engine/src/combat.ts:195-197'
  - 'engine/src/combat.ts:184-189'
priority: medium
ordinal: 840
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Problem

`engine/src/combat.ts:197` sets `lpStep.absorbed = lpDamage` where `lpDamage` is the final damage dealt to the player after heart shield and spade doubling. The `absorbed` field in the combat log step is meant to record what was absorbed by the target's defenses. Setting it to the final damage (what got through) makes it circular and misleading for any audit tooling or narration that uses this field.

The `incomingDamage` field (line 195) already records the pre-shield overflow, which is the correct "incoming" value. `absorbed` should be `incomingDamage - lpDamage` (the amount absorbed by the heart shield) or 0 if no shield applied.

## Evidence

- `combat.ts:195`: `incomingDamage: overflow` (pre-shield)
- `combat.ts:197`: `absorbed: lpDamage` (post-shield — incorrect semantic)
- The heart shield subtraction happens at `combat.ts:184-189`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 lpStep.absorbed correctly reflects the heart shield reduction (incomingDamage - lpDamage)
- [ ] #2 lpStep.absorbed is 0 when no heart shield applies
- [ ] #3 lpStep.incomingDamage remains the pre-shield overflow value
- [ ] #4 Narration and audit tooling that consumes combat log steps is not broken by this correction
<!-- AC:END -->
