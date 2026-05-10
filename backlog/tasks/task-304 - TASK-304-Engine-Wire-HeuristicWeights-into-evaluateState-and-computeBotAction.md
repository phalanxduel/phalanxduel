---
id: TASK-304
title: 'TASK-304 - Engine: Wire HeuristicWeights into evaluateState and computeBotAction'
status: To Do
assignee: []
created_date: '2026-05-10'
updated_date: '2026-05-10'
labels:
  - engine
  - bot
  - feature
dependencies:
  - TASK-303
priority: medium
milestone: m-13
---

## Description

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

## Acceptance Criteria

- [ ] AC-1: 100 calls with same seed, `{ strategy: 'heuristic' }` produce identical results before and after change (snapshot or seed test)
- [ ] AC-2: Over 50 random mid-game positions, `tier='destroyer'` selects column-concentrated attacks more frequently than `tier='sentinel'`
- [ ] AC-3: Over 50 positions with defensive options available, `tier='sentinel'` selects defensive moves more than `tier='veteran'`
- [ ] AC-4: Round-robin 20 games (same seed): champion beats soldier > 60% of time; soldier beats grunt > 60% of time
- [ ] AC-5: `pnpm --filter @phalanxduel/engine test` exits 0
- [ ] AC-6: `pnpm check` exits 0

## Definition of Done

- [ ] `evaluateState` accepts optional `HeuristicWeights`, applies multipliers to sub-scores
- [ ] Default weights produce identical output to pre-change (snapshot/seed test passing)
- [ ] `computeBotAction` accepts `tier`, maps to TIER_CONFIG, passes weights down
- [ ] AC-2 behavioral divergence test written and passing
- [ ] AC-4 win-rate test written and passing (or manual benchmark documented)
- [ ] `pnpm --filter @phalanxduel/engine test` exits 0
- [ ] `pnpm check` exits 0
- [ ] Committed on main
