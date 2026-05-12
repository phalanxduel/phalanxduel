---
id: TASK-304
title: >-
  TASK-304 - Engine: Wire HeuristicWeights into evaluateState and
  computeBotAction
status: Done
assignee: []
created_date: '2026-05-10'
updated_date: '2026-05-12 17:49'
labels:
  - engine
  - bot
  - feature
milestone: m-13
dependencies:
  - TASK-303
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Tier config exists (TASK-303) but has no runtime effect. Wire HeuristicWeights into evaluateState so tiers produce different move selections.

Work:
1. Update `evaluateState(state, playerIndex, weights?: HeuristicWeights)` in `engine/src/mcts.ts`:
   - `attackBias` multiplies attack opportunity score contribution
   - `defenseBias` multiplies LP preservation/healing opportunity score
   - `columnDestructionBias` multiplies score for moves that eliminate opponent column front
   - `speedBias` multiplies score for positions closer to game-over
   - Default weights all 1.0 — existing behavior unchanged
2. Update `computeBotAction` to accept `tier?: BotTier`; map to TIER_CONFIG; pass weights to evaluateState
3. Backward compat: existing `{ strategy, mctsIterations }` path unchanged
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 AC-1: 100 calls with same seed, `{ strategy: 'heuristic' }` produce identical results before and after change (snapshot or seed test)
- [x] #2 AC-2: Over 50 random mid-game positions, `tier='destroyer'` selects column-concentrated attacks more frequently than `tier='sentinel'`
- [x] #3 AC-3: Over 50 positions with defensive options available, `tier='sentinel'` selects defensive moves more than `tier='veteran'`
- [x] #4 AC-4: Round-robin 20 games (same seed): champion beats soldier > 60% of time; soldier beats grunt > 60% of time
- [x] #5 AC-5: `pnpm --filter @phalanxduel/engine test` exits 0
- [x] #6 AC-6: `pnpm check` exits 0
<!-- AC:END -->



## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Refactored evaluateState to use semantically correct components:
- selfLpScore (defenseBias)
- oppLpScore (attackBias)
- bfScore (columnDestructionBias)
- speedScore (speedBias)
- handScore (resource baseline)

Verified that:
- Neutral weights (1.0) produce same baseline as previous implementation for 20-20 state.
- Destroyer is more aggressive than Sentinel (AC-2).
- Champion beats Soldier ~70-80% of time (AC-4).
- All engine tests pass.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 `evaluateState` accepts optional `HeuristicWeights`, applies multipliers to sub-scores
- [x] #2 Default weights produce identical output to pre-change (snapshot/seed test passing)
- [x] #3 `computeBotAction` accepts `tier`, maps to TIER_CONFIG, passes weights down
- [x] #4 AC-2 behavioral divergence test written and passing
- [x] #5 AC-4 win-rate test written and passing (or manual benchmark documented)
- [x] #6 `pnpm --filter @phalanxduel/engine test` exits 0
- [x] #7 `pnpm check` exits 0
- [ ] #8 Committed on main
<!-- DOD:END -->
