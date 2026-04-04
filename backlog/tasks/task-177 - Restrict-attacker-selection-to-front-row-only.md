---
id: TASK-177
title: Restrict attacker selection to front row only
status: Planned
assignee: []
created_date: '2026-04-04 12:00'
labels:
  - ui
  - safety
dependencies: []
references:
  - client/src/game.ts
  - backlog/decisions/decision-028 - DEC-2G-001 - Client UI-UX audit and remediation plan.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The click handler for the player's occupied cells during `AttackPhase` at
`game.ts:181-183` calls `selectAttacker(pos)` for any occupied cell — no
`pos.row === 0` guard. The player can select a back-row card, see valid targets
light up in the opponent's column, and then the attack fails server-side.

This prevents illegal action paths in the primary action loop. The server
validates correctly, but the client should not allow the selection in the first
place (DEC-2G-001 finding F-14).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Only row-0 (front row) cards are clickable as attackers during `AttackPhase`
- [ ] #2 Back-row card clicks do nothing (no `selectAttacker` call, no visual selection)
- [ ] #3 The `pz-active-pulse` animation only applies to row-0 cards (already partially true)
- [ ] #4 Existing attack flow for front-row cards is unchanged
<!-- AC:END -->

## Verification

```bash
# Client test suite
pnpm --filter @phalanxduel/client test
# Expected: new test passes asserting back-row click does not select attacker

# Full suite
pnpm -r test
# Expected: all tests pass
```

## QA Impact

No QA automation changes expected. Bots already target `player-cell-r0-c*`
for attacker selection. This task only blocks clicks that bots don't make.

## Changelog

```markdown
### Fixed
- **Attack Selection**: Only front-row cards can now be selected as attackers.
  Previously, clicking a back-row card appeared to select it but the attack
  would fail — now back-row cards are clearly non-interactive during combat.
```

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] `pos.row === 0` guard added to attacker selection click handler
- [ ] New test: back-row click does not call `selectAttacker()`
- [ ] `pnpm -r test` passes
- [ ] `pnpm qa:api:run` succeeds
- [ ] `pnpm qa:playthrough:run` succeeds
- [ ] No existing tests broken
<!-- DOD:END -->
