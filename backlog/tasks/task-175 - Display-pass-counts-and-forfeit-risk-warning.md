---
id: TASK-175
title: Display pass counts and forfeit risk warning
status: In Progress
assignee:
  - Gemini CLI
created_date: '2026-04-04 12:00'
updated_date: '2026-04-04 15:27'
labels:
  - ui
  - safety
  - clarity
dependencies: []
references:
  - client/src/game.ts
  - client/src/state.ts
  - shared/src/schema.ts
  - >-
    backlog/decisions/decision-028 - DEC-2G-001 - Client UI-UX audit and
    remediation plan.md
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

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Pass counts render from `gs.passState`
- [ ] #2 Warning badge appears at threshold
- [ ] #3 New tests: count rendering, warning at threshold, no warning below threshold
- [ ] #4 `pnpm -r test` passes
- [ ] #5 `pnpm qa:api:run` succeeds
- [ ] #6 `pnpm qa:playthrough:run` succeeds
- [ ] #7 No existing tests broken
<!-- DOD:END -->
