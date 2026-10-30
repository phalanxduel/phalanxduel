---
id: TASK-174
title: Add Skip Reinforcement button to ReinforcementPhase
status: Done
assignee:
  - Gemini CLI
created_date: '2026-04-04 12:00'
updated_date: '2026-04-04 15:24'
labels:
  - ui
  - safety
  - critical
dependencies: []
references:
  - client/src/game.ts
  - engine/src/turns.ts
  - >-
    docs/adr/decision-028 - DEC-2G-001 - Client UI-UX audit and
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
- [x] #1 During `ReinforcementPhase`, a "Skip Reinforcement" button is visible alongside Forfeit and Help
- [x] #2 Clicking the button sends a `{ type: 'pass' }` action to the server
- [x] #3 The button label or tooltip communicates that skipping is free (does not count toward pass limits)
- [x] #4 The button does not appear during `AttackPhase` (existing Pass button handles that)
- [x] #5 Spectators do not see the button
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented 'Skip' button for ReinforcementPhase in both Vanilla and Preact client implementations.
Updated getActionButtons helper and renderers to include the Skip button (data-testid="combat-skip-reinforce-btn") when it is the player's turn in ReinforcementPhase.
The button sends a '{ type: "pass" }' action, which the engine already handles as a non-penalized skip of reinforcement.
Added unit tests to verify button visibility and updated QA bot scripts (simulate-ui.ts and simulate-headless.ts) to utilize the skip button when reinforcement is not possible or desired.
Verified with pnpm -r test and full QA playthroughs.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Skip Reinforcement button renders during ReinforcementPhase
- [x] #2 Button has `data-testid="combat-skip-reinforce-btn"`
- [x] #3 Button sends correct pass action
- [x] #4 New test: `getActionButtons` returns Skip during ReinforcementPhase
- [x] #5 QA bot scripts (`simulate-ui.ts`, `simulate-headless.ts`) updated to handle the new button
- [x] #6 `pnpm -r test` passes
- [x] #7 `pnpm qa:api:run` succeeds
- [x] #8 `pnpm qa:playthrough:run` succeeds
- [x] #9 No existing tests broken
<!-- DOD:END -->
