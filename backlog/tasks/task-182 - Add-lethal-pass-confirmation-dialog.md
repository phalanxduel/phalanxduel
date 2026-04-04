---
id: TASK-182
title: Add lethal-pass confirmation dialog
status: In Progress
assignee:
  - Gemini CLI
created_date: '2026-04-04 12:00'
updated_date: '2026-04-04 15:37'
labels:
  - ui
  - safety
dependencies:
  - TASK-175
references:
  - client/src/game.ts
  - >-
    backlog/decisions/decision-028 - DEC-2G-001 - Client UI-UX audit and
    remediation plan.md
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The Pass button at `game.ts:594-604` sends immediately on click with no
confirmation, despite counting toward a forfeit-triggering limit (3 consecutive
or 5 total).

Per DEC-2G-001: pass counts should always be visible (TASK-175 handles that).
Confirmation is only required when the next pass would **immediately cause
forfeit** — i.e., the pass is lethal. This is the last-resort safety net, not
a blanket interruption (finding F-10).

Depends on TASK-175 (pass counts visible) because counts alone should be
sufficient for sub-lethal awareness.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 When the next pass would trigger automatic forfeit (consecutivePasses == maxConsecutivePasses - 1 OR totalPasses == maxTotalPassesPerPlayer - 1), a confirmation dialog appears before sending
- [ ] #2 The confirmation clearly states "This pass will forfeit the match" (or equivalent)
- [ ] #3 Non-lethal passes send immediately with no interruption
- [ ] #4 The confirmation is a styled modal (not `window.confirm`), consistent with the Forfeit confirmation pattern
- [ ] #5 Spectators are unaffected
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Lethal pass triggers confirmation with `data-testid="lethal-pass-confirm-btn"`
- [ ] #2 Non-lethal pass is uninterrupted (no flow change)
- [ ] #3 New tests cover both paths
- [ ] #4 QA bot scripts updated to handle lethal-pass confirmation dialog
- [ ] #5 `pnpm -r test` passes
- [ ] #6 `pnpm qa:api:run` succeeds
- [ ] #7 `pnpm qa:playthrough:run` succeeds
- [ ] #8 No existing tests broken
<!-- DOD:END -->
