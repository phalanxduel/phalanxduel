---
id: TASK-183
title: Add carryover values to battle log
status: Planned
assignee: []
created_date: '2026-04-04 12:00'
labels:
  - ui
  - clarity
  - engine
dependencies: []
references:
  - client/src/game.ts
  - engine/src/combat.ts
  - shared/src/schema.ts
  - backlog/decisions/decision-028 - DEC-2G-001 - Client UI-UX audit and remediation plan.md
priority: high
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
- [ ] #1 `CombatLogStepSchema` in `shared/src/schema.ts` includes an optional `remaining` field (number, >= 0)
- [ ] #2 `resolveColumnOverflow()` in `engine/src/combat.ts` populates `remaining` after each step
- [ ] #3 Battle log in `client/src/game.ts` (`renderBattleLog`) shows carryover between targets (e.g., "→2 carry →")
- [ ] #4 The schema change is additive and backwards-compatible (existing logs without `remaining` still render correctly)
- [ ] #5 Narration overlay optionally includes carryover values in overflow lines
<!-- AC:END -->

## Verification

```bash
# Engine tests (combat resolution)
pnpm --filter @phalanxduel/engine test
# Expected: combat steps include remaining field

# Schema validation
pnpm --filter @phalanxduel/shared test
# Expected: schema tests pass

# Client rendering
pnpm --filter @phalanxduel/client test
# Expected: battle log format includes carryover

# Full suite
pnpm -r test
# Expected: no regressions
```

## QA Impact

API playthrough (`api-playthrough.ts`) validates final state hashes. Adding
a `remaining` field to `CombatLogStep` changes the state hash if the field
is included in transaction log entries. Verify that the schema change is
additive (optional field, default undefined) so existing state hashes are
preserved for games without the new field.

No Playwright selector changes expected — the battle log is a passive display.

## Changelog

```markdown
### Added
- **Damage Carryover**: The battle log now shows how much damage carries
  between targets in a column. When your 7♠ attacks and destroys a 3♦ front
  card, you can see "→4 carry→" before the back card takes the remaining
  damage. This makes the core combat chain visible for the first time.
```

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] Schema updated with optional `remaining` field (backwards-compatible)
- [ ] Engine emits `remaining` in combat steps
- [ ] Client battle log displays carryover between targets
- [ ] Existing state hashes unchanged for games without the new field
- [ ] Tests added/updated across shared, engine, client
- [ ] `pnpm -r test` passes
- [ ] `pnpm qa:api:run` succeeds (state hash validation)
- [ ] `pnpm qa:playthrough:run` succeeds
- [ ] No existing tests broken
<!-- DOD:END -->
