---
id: TASK-181
title: Fix diamond narration text accuracy
status: Planned
assignee: []
created_date: '2026-04-04 12:00'
labels:
  - ui
  - clarity
dependencies:
  - TASK-179
references:
  - client/src/narration-producer.ts
  - backlog/decisions/decision-028 - DEC-2G-001 - Client UI-UX audit and remediation plan.md
priority: medium
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
- [ ] #1 `diamondDoubleDefense` message updated to accurately describe absorption (e.g., "...absorbed by Diamond Shield")
- [ ] #2 The text does not say "halved", "divided", or imply a fractional reduction
- [ ] #3 Consistent wording style with other bonus messages
<!-- AC:END -->

## Verification

```bash
pnpm --filter @phalanxduel/client test
# Expected: narration snapshot tests updated, all pass
```

## QA Impact

No QA automation changes expected. Narration text is not parsed by QA bots.

## Changelog

```markdown
### Fixed
- **Diamond Shield Description**: The combat narration now correctly says
  "absorbed by Diamond Shield" instead of "halved by Diamond Defense."
  Diamonds absorb a fixed amount of overflow equal to the card's value —
  they don't halve it.
```

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] Narration text matches actual mechanic (absorption, not halving)
- [ ] Tests updated
- [ ] `pnpm -r test` passes
- [ ] `pnpm qa:playthrough:run` succeeds
- [ ] No existing tests broken
<!-- DOD:END -->
