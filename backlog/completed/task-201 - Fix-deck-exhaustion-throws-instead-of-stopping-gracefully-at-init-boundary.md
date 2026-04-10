---
id: TASK-201
title: 'Fix: deck exhaustion throws instead of stopping gracefully at init boundary'
status: Done
assignee: []
created_date: '2026-04-06 15:28'
updated_date: '2026-04-10 01:56'
labels:
  - qa
  - engine
  - rules
  - p1
  - correctness
dependencies: []
references:
  - 'engine/src/state.ts:192-194'
  - 'engine/src/state.ts:147-148'
  - 'engine/src/turns.ts:46'
  - docs/RULES.md §15
priority: high
ordinal: 500
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Problem

`engine/src/state.ts:192-194` has `drawCards` throw `Error('Not enough cards in drawpile...')` when fewer cards are available than requested. While `performDrawPhase` in `turns.ts:46` correctly guards with `Math.min(toDraw, player.drawpile.length)`, `createInitialState` calls `drawCards(state, 0, initialDraw, ...)` directly without this guard.

RULES.md §15 states: "Empty deck does not cause loss." The spirit of this rule extends to initialization — misconfigured non-canonical parameters should not produce a hard crash.

## Evidence

- `engine/src/state.ts:192-194`: throws on drawpile undercount
- `engine/src/state.ts:147-148`: `createInitialState` calls `drawCards(state, 0, config.initialDraw, ...)` without guard
- RULES.md §15: "no reshuffle; empty deck does not cause loss"

## Fix

Guard the `drawCards` call in `createInitialState` with `Math.min(initialDraw, player.drawpile.length)`. Add a test for initialization with `initialDraw` > deck size to verify it silently draws all available cards rather than throwing.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 createInitialState with initialDraw > deck size draws all available cards without throwing
- [ ] #2 performDrawPhase with empty deck silently draws 0 cards without throwing
- [ ] #3 New test: deck exhaustion at init — graceful stop, not throw
- [ ] #4 New test: draw phase with empty deck — hand unchanged, no error
- [ ] #5 All existing engine tests still pass
<!-- AC:END -->
