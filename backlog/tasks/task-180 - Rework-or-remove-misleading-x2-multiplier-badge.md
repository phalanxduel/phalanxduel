---
id: TASK-180
title: Rework or remove misleading x2 multiplier badge
status: Planned
assignee: []
created_date: '2026-04-04 12:00'
labels:
  - ui
  - clarity
dependencies: []
references:
  - client/src/game.ts
  - backlog/decisions/decision-028 - DEC-2G-001 - Client UI-UX audit and remediation plan.md
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
- [ ] #1 The x2 badge no longer appears on cards where the effect cannot trigger
- [ ] #2 If Option A: badge removed entirely; suit behavior explained in help content
- [ ] #3 If Option B: badge replaced with a non-promissory marker
- [ ] #4 ATK/DEF type badges are unaffected (these are categorical, not conditional)
- [ ] #5 No change to actual combat mechanics
<!-- AC:END -->

## Verification

```bash
pnpm --filter @phalanxduel/client test
# Expected: badge tests updated, all pass

pnpm -r test
# Expected: no regressions
```

## QA Impact

No QA automation changes expected. The x2 badge is a passive visual indicator.
QA bots do not use `.pz-multiplier` for targeting.

## Changelog

```markdown
### Changed
- **Suit Badges**: The "x2" multiplier badge no longer appears on cards where
  the double-damage effect cannot activate. This prevents false expectations
  about Club and Spade bonuses that only trigger under specific conditions.
```

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] x2 badge no longer misleads about effect activation
- [ ] Option chosen and implemented consistently
- [ ] Tests updated
- [ ] `pnpm -r test` passes
- [ ] `pnpm qa:playthrough:run` succeeds
- [ ] No existing tests broken
<!-- DOD:END -->
