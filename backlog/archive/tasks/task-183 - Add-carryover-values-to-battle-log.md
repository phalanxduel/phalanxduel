---
id: TASK-183
title: Add carryover values to battle log
status: Done
assignee: []
created_date: '2026-04-04 12:00'
updated_date: '2026-04-06 02:12'
labels:
  - ui
  - clarity
  - engine
dependencies: []
references:
  - client/src/game.ts
  - engine/src/combat.ts
  - shared/src/schema.ts
  - >-
    docs/adr/decision-028 - DEC-2G-001 - Client UI-UX audit and
    remediation plan.md
priority: high
ordinal: 93000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The core mechanic — Front → Back → Player with carryover and suit-effect
boundaries — is the least visible part of the game. Narration and battle log
show damage dealt per target but never the intermediate `remaining` value
carried forward between targets.

This is UI + API: `CombatLogStep` needs an additive `remaining` field emitted
by the engine after each step. The client then formats it in the battle log
(DEC-2G-001 finding F-04).

This task is conditionally placed in Wave 2. If the engine schema change is
larger than expected, it moves to Wave 3.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 `CombatLogStepSchema` in `shared/src/schema.ts` includes an optional `remaining` field (number, >= 0)
- [x] #2 `resolveColumnOverflow()` in `engine/src/combat.ts` populates `remaining` after each step
- [x] #3 Battle log in `client/src/game.ts` (`renderBattleLog`) shows carryover between targets (e.g., "→2 carry →")
- [x] #4 The schema change is additive and backwards-compatible (existing logs without `remaining` still render correctly)
- [ ] #5 Narration overlay optionally includes carryover values in overflow lines
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
AC#5 (narration overlay carryover) was a stretch goal and was not implemented. The battle log already shows →N→ carryover (AC#3). Narration overlay carryover would be a separate follow-up if desired.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added optional `remaining` field to `CombatLogStepSchema` (shared/src/schema.ts) representing damage carried forward to the next target. Engine (`resolveColumnOverflow`, `absorbDamage`) now sets `remaining` on every step — mirrors `overflow` but also updated post-diamond-shield. LP step gets `remaining: 0`. Battle log in `renderBattleLog` shows `→N→` carryover arrow for card steps with non-zero carry. Also added `diamondDeathShield` to `BONUS_LABELS`. OpenAPI snapshot regenerated. All 715 tests pass.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Schema updated with optional `remaining` field (backwards-compatible)
- [x] #2 Engine emits `remaining` in combat steps
- [x] #3 Client battle log displays carryover between targets
- [x] #4 Existing state hashes unchanged for games without the new field
- [x] #5 Tests added/updated across shared, engine, client
- [x] #6 `pnpm -r test` passes
- [x] #7 `pnpm qa:api:run` succeeds (state hash validation)
- [x] #8 `pnpm qa:playthrough:run` succeeds
- [x] #9 No existing tests broken
<!-- DOD:END -->
