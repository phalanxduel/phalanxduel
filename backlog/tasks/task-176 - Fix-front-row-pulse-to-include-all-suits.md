---
id: TASK-176
title: Fix front-row pulse to include all suits
status: Planned
assignee: []
created_date: '2026-04-04 12:00'
labels:
  - ui
  - clarity
dependencies: []
references:
  - client/src/game.ts
  - client/src/cards.ts
  - backlog/decisions/decision-028 - DEC-2G-001 - Client UI-UX audit and remediation plan.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
`pz-active-pulse` at `game.ts:168` is gated by `isWeapon(bCard.card.suit)`,
which only returns true for spades and clubs. Hearts and diamonds at row 0 are
also valid attackers but do not pulse.

This misleads players into thinking only spades/clubs can attack from the front
row (DEC-2G-001 finding F-08).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 All front-row (row 0) cards receive `pz-active-pulse` during `AttackPhase` when it is the player's turn
- [ ] #2 The `isWeapon()` check is removed from the pulse condition (keep it only for x2 badge logic)
- [ ] #3 Back-row cards still do not pulse
- [ ] #4 Existing animation timing and CSS are unchanged
<!-- AC:END -->

## Verification

```bash
pnpm --filter @phalanxduel/client test
# Expected: updated pulse assertion passes for all suits at row 0
```

## QA Impact

No QA automation changes expected. `pz-active-pulse` is a visual CSS animation
that does not affect QA selectors. Bot card targeting uses `data-testid`
attributes, not pulse classes.

## Changelog

```markdown
### Fixed
- **Attack Indicators**: All front-row cards now pulse during your attack
  phase, not just Spades and Clubs. Hearts and Diamonds in the front row are
  valid attackers too — the UI now makes that clear.
```

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] `isWeapon` guard removed from pulse logic at `game.ts:168`
- [ ] Pulse applies to all suits at row 0 during AttackPhase
- [ ] Tests updated
- [ ] `pnpm -r test` passes
- [ ] `pnpm qa:playthrough:run` succeeds
- [ ] No existing tests broken
<!-- DOD:END -->
