---
id: TASK-1
title: Forfeit After Repeated Total Passes
status: Done
assignee: []
created_date: '2026-03-12 01:31'
updated_date: '2026-03-15 15:35'
labels: []
dependencies: []
ordinal: 16000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Phalanx Duel needs deterministic anti-stalling rules so matches cannot drag on
through endless pass loops. This task shipped the rules-spec pass limits into
the engine and shared schema so repeated passes end the match with a canonical
`passLimit` outcome.

## Historical Outcome

Given a match with configured pass limits, when a player exceeds either the
consecutive-pass limit or the total-pass limit, then the engine now ends the
game immediately and awards victory to the opponent with `victoryType:
passLimit`.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Given match parameters with pass rules, when a player exceeds
  `maxConsecutivePasses`, then the game ends with a `passLimit` victory for the
  opponent.
- [x] #2 Given match parameters with pass rules, when a player exceeds
  `maxTotalPassesPerPlayer`, then the game ends with a `passLimit` victory for
  the opponent.
- [x] #3 Given a player attacks after passing, when the action resolves, then that
  player's consecutive-pass counter resets without losing total-pass history.
- [x] #4 Given the result is serialized, when clients or replay tooling consume the
  game state, then `passState` and `victoryType: passLimit` are present in the
  shared schema.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- `engine/src/turns.ts` tracks consecutive and total pass counts and converts
  threshold violations into `gameOver`.
- `shared/src/schema.ts` exposes the pass-rule configuration, pass-state
  counters, and `passLimit` victory type.
- `engine/tests/pass-rules.test.ts` and
  `engine/tests/state-machine.test.ts` cover the rule transitions.

## Verification

- `pnpm -C engine test -- pass-rules.test.ts state-machine.test.ts`
<!-- SECTION:NOTES:END -->
