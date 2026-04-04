---
id: TASK-184
title: Expand help content for all core mechanics
status: Planned
assignee: []
created_date: '2026-04-04 12:00'
labels:
  - ui
  - ux
dependencies: []
references:
  - client/src/help.ts
  - docs/RULES.md
  - backlog/decisions/decision-028 - DEC-2G-001 - Client UI-UX audit and remediation plan.md
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
`HELP_CONTENT` in `help.ts` has only 5 topics (LP, Battlefield, Hand, Stats,
Battle Log). There is no coverage of: suit effects (spade/heart/diamond/club
boundary behaviors), face card destruction hierarchy, ace invulnerability,
pass/forfeit rules, target chain mechanics, reinforcement rules, or damage
modes (DEC-2G-001 finding F-11).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 New help entries added for at least: suit effects, face card hierarchy, ace rules, pass/forfeit rules, target chain, reinforcement
- [ ] #2 Help markers placed on relevant UI sections (e.g., suit effects near battlefield cards, pass rules near pass button)
- [ ] #3 Content is concise but accurate — derived from RULES.md, not invented
- [ ] #4 Existing 5 help topics are preserved unchanged
- [ ] #5 Help overlay rendering handles new entries without layout issues
<!-- AC:END -->

## Verification

```bash
pnpm --filter @phalanxduel/client test
# Expected: all tests pass

pnpm -r test
# Expected: no regressions
```

## QA Impact

No QA automation changes expected. Help markers are toggled by the Help
button which QA bots do not click. Help overlays are modal and
non-interactive for bot flows.

## Changelog

```markdown
### Added
- **In-Game Help**: New help topics explain suit effects (Spade double-damage,
  Heart shields, Diamond overflow absorption, Club overflow doubling), face
  card hierarchy, ace invulnerability, pass/forfeit rules, and the target
  chain. Toggle "Help ?" during a match to see contextual explanations near
  each part of the board.
```

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] 6+ new HELP_CONTENT entries
- [ ] Help markers added to relevant UI locations
- [ ] Content verified against RULES.md
- [ ] `pnpm -r test` passes
- [ ] `pnpm qa:playthrough:run` succeeds
- [ ] No existing tests broken
<!-- DOD:END -->
