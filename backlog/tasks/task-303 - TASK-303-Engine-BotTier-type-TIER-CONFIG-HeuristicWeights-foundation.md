---
id: TASK-303
title: 'TASK-303 - Engine: BotTier type, TIER_CONFIG, HeuristicWeights foundation'
status: Done
assignee: []
created_date: '2026-05-10'
updated_date: '2026-05-10'
labels:
  - engine
  - bot
  - feature
dependencies: []
priority: medium
milestone: m-13
---

## Description

Create the type system and config for 8 named bot difficulty tiers (scout→champion). No runtime behavior change yet — that is TASK-304.

Create `engine/src/bot-tiers.ts`:
- `HeuristicWeights`: `{ attackBias, defenseBias, columnDestructionBias, speedBias }` each number 0.0–2.0 (1.0 = neutral)
- `BotTier` union type: 'scout' | 'grunt' | 'soldier' | 'veteran' | 'destroyer' | 'sentinel' | 'blitz' | 'champion'
- `TierConfig`: `{ strategy, mctsIterations, weights: HeuristicWeights, description: string }`
- `TIER_CONFIG: Record<BotTier, TierConfig>` with all 8 tiers:

| Tier | Strategy | Iters | attackBias | defenseBias | columnDestructionBias | speedBias |
|------|----------|-------|-----------|------------|----------------------|-----------|
| scout | random | 0 | 1.0 | 1.0 | 1.0 | 1.0 |
| grunt | heuristic | 0 | 1.0 | 1.0 | 1.0 | 1.0 |
| soldier | mcts | 100 | 1.0 | 1.0 | 1.0 | 1.0 |
| veteran | mcts | 500 | 1.8 | 0.8 | 1.0 | 1.0 |
| destroyer | mcts | 500 | 1.2 | 0.7 | 2.0 | 1.0 |
| sentinel | mcts | 500 | 0.6 | 2.0 | 0.8 | 0.8 |
| blitz | mcts | 300 | 1.4 | 0.7 | 1.0 | 2.0 |
| champion | mcts | 1000 | 1.0 | 1.0 | 1.0 | 1.0 |

Export from `engine/src/index.ts`.

## Acceptance Criteria

- [ ] AC-1: `Object.keys(TIER_CONFIG).length === 8` in unit test
- [ ] AC-2: Tiers 4–7 (veteran, destroyer, sentinel, blitz) have distinct weight profiles from each other
- [ ] AC-3: All weight values within [0.0, 2.0] — unit test iterates TIER_CONFIG and asserts range
- [ ] AC-4: `pnpm --filter @phalanxduel/engine typecheck` exits 0
- [ ] AC-5: `pnpm --filter @phalanxduel/engine test` exits 0 — no existing behavior changed

## Definition of Done

- [ ] `engine/src/bot-tiers.ts` created with all types and TIER_CONFIG
- [ ] Tiers 4–7 have distinct weight profiles
- [ ] Exports added to `engine/src/index.ts`
- [ ] Unit tests: key count, weight range, tier distinctness
- [ ] `pnpm --filter @phalanxduel/engine typecheck` exits 0
- [ ] `pnpm --filter @phalanxduel/engine test` exits 0
- [ ] `pnpm check` exits 0
- [ ] Committed on main
