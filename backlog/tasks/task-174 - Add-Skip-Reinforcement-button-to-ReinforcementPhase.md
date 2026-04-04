---
id: TASK-174
title: Add Skip Reinforcement button to ReinforcementPhase
status: In Progress
assignee:
  - Gemini CLI
created_date: '2026-04-04 12:00'
updated_date: '2026-04-04 15:03'
labels:
  - ui
  - safety
  - critical
dependencies: []
references:
  - client/src/game.ts
  - engine/src/turns.ts
  - >-
    backlog/decisions/decision-028 - DEC-2G-001 - Client UI-UX audit and
    remediation plan.md
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
`getActionButtons()` at `game.ts:69` only shows the Pass button during
`AttackPhase`. During `ReinforcementPhase`, the player can only Forfeit or play
a card. The engine supports `pass` during reinforcement — `applyPass()` in
`turns.ts:454-461` transitions through DrawPhase → EndTurn → StartTurn without
touching `passState`. Reinforcement skip is confirmed free (does not increment
consecutive or total pass counters).

The player is currently trapped: they must reinforce or forfeit the match.
This is a gameplay-blocking defect (DEC-2G-001 finding F-01).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 During `ReinforcementPhase`, a "Skip Reinforcement" button is visible alongside Forfeit and Help
- [ ] #2 Clicking the button sends a `{ type: 'pass' }` action to the server
- [ ] #3 The button label or tooltip communicates that skipping is free (does not count toward pass limits)
- [ ] #4 The button does not appear during `AttackPhase` (existing Pass button handles that)
- [ ] #5 Spectators do not see the button
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Skip Reinforcement button renders during ReinforcementPhase
- [ ] #2 Button has `data-testid="combat-skip-reinforce-btn"`
- [ ] #3 Button sends correct pass action
- [ ] #4 New test: `getActionButtons` returns Skip during ReinforcementPhase
- [ ] #5 QA bot scripts (`simulate-ui.ts`, `simulate-headless.ts`) updated to handle the new button
- [ ] #6 `pnpm -r test` passes
- [ ] #7 `pnpm qa:api:run` succeeds
- [ ] #8 `pnpm qa:playthrough:run` succeeds
- [ ] #9 No existing tests broken
<!-- DOD:END -->
