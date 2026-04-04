---
id: TASK-174
title: Add Skip Reinforcement button to ReinforcementPhase
status: Planned
assignee: []
created_date: '2026-04-04 12:00'
labels:
  - ui
  - safety
  - critical
dependencies: []
references:
  - client/src/game.ts
  - engine/src/turns.ts
  - backlog/decisions/decision-028 - DEC-2G-001 - Client UI-UX audit and remediation plan.md
priority: critical
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

## Verification

```bash
# Unit tests for getActionButtons
pnpm --filter @phalanxduel/client test -- --grep "getActionButtons"
# Expected: new test passes asserting Skip button present during ReinforcementPhase

# Full client test suite
pnpm --filter @phalanxduel/client test
# Expected: all tests pass, no regressions
```

## QA Impact

The new Skip button introduces a new action path during ReinforcementPhase.
Both `simulate-ui.ts` and `simulate-headless.ts` interact with reinforcement
via `.hand-card.reinforce-playable` and `.bf-cell.reinforce-col.valid-target`.
The bots must be updated to sometimes click the Skip button instead of always
reinforcing, otherwise QA stalls when the button appears but is not used.

- Add `data-testid="combat-skip-reinforce-btn"` to the new button
- Update `simulate-ui.ts` reinforcement phase handler to randomly choose
  between reinforce and skip
- Update `simulate-headless.ts` similarly

## Changelog

```markdown
### Fixed
- **Reinforcement Phase**: You can now skip reinforcement instead of being
  forced to play a card. Previously, declining reinforcement required
  forfeiting the entire match — now a "Skip" button lets you pass freely
  without penalty.
```

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] Skip Reinforcement button renders during ReinforcementPhase
- [ ] Button has `data-testid="combat-skip-reinforce-btn"`
- [ ] Button sends correct pass action
- [ ] New test: `getActionButtons` returns Skip during ReinforcementPhase
- [ ] QA bot scripts (`simulate-ui.ts`, `simulate-headless.ts`) updated to handle the new button
- [ ] `pnpm -r test` passes
- [ ] `pnpm qa:api:run` succeeds
- [ ] `pnpm qa:playthrough:run` succeeds
- [ ] No existing tests broken
<!-- DOD:END -->
