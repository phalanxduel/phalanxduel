---
id: TASK-175
title: Display pass counts and forfeit risk warning
status: Planned
assignee: []
created_date: '2026-04-04 12:00'
labels:
  - ui
  - safety
  - clarity
dependencies: []
references:
  - client/src/game.ts
  - client/src/state.ts
  - shared/src/schema.ts
  - backlog/decisions/decision-028 - DEC-2G-001 - Client UI-UX audit and remediation plan.md
priority: critical
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
`passState` (consecutivePasses, totalPasses) exists in `GameState` but is never
rendered in the client. Zero references to `passState`, `consecutivePasses`, or
`totalPasses` anywhere in `client/src/`. Pass limits are 3 consecutive = forfeit,
5 total = forfeit. The player can be one pass from automatic forfeit with no
indication.

If the UI hides pass counts, the system is technically correct and
experientially wrong (DEC-2G-001 finding F-02).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Pass counts (consecutive and total) are visible in the stats sidebar or info bar during `AttackPhase`
- [ ] #2 A warning badge appears when the player is within 1 of any forfeit threshold (e.g., 2/3 consecutive or 4/5 total)
- [ ] #3 The warning is visually distinct (color-coded red or equivalent)
- [ ] #4 Pass counts are derived from `gs.passState` — no local tracking
- [ ] #5 When passState is absent or zero, the counter is hidden or reads 0 unobtrusively
<!-- AC:END -->

## Verification

```bash
# Client test suite
pnpm --filter @phalanxduel/client test
# Expected: new tests pass for pass count rendering and warning threshold

# Full suite
pnpm -r test
# Expected: all tests pass
```

## QA Impact

No QA selector changes expected. The pass count display is passive (not
interactive). QA bots already pass via `[data-testid="combat-pass-btn"]` and
this task does not change that selector.

## Changelog

```markdown
### Added
- **Pass Counter**: Your consecutive and total pass counts are now visible
  during combat. A warning appears when you're close to the automatic forfeit
  threshold, so you're never surprised by a sudden loss from passing too often.
```

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] Pass counts render from `gs.passState`
- [ ] Warning badge appears at threshold
- [ ] New tests: count rendering, warning at threshold, no warning below threshold
- [ ] `pnpm -r test` passes
- [ ] `pnpm qa:api:run` succeeds
- [ ] `pnpm qa:playthrough:run` succeeds
- [ ] No existing tests broken
<!-- DOD:END -->
