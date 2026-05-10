---
id: TASK-305
title: 'TASK-305 - MCP: Expose BotTier in engine_bot_recommend and match_create'
status: To Do
assignee: []
created_date: '2026-05-10'
updated_date: '2026-05-10'
labels:
  - mcp
  - feature
dependencies:
  - TASK-304
priority: medium
milestone: m-13
---

## Description

Engine supports tiers (TASK-304). Surface them in the MCP API.

Work:
1. `engine_bot_recommend` (`mcp/src/tools/engine.ts`): add `tier?: BotTier` to input schema; pass to computeBotAction; echo tier in response
2. `match_create` (`mcp/src/tools/gameplay.ts`): accept all 8 tier codenames in `opponent` field; map legacy aliases `bot-random`→`scout`, `bot-heuristic`→`grunt`, `bot-mcts`→`soldier`
3. `mcp/README.md`: update tool descriptions

## Acceptance Criteria

- [ ] AC-1: `engine_bot_recommend({ state, tier: 'destroyer' })` returns valid action with `tier: 'destroyer'` in response
- [ ] AC-2: Legacy `engine_bot_recommend({ state, strategy: 'heuristic' })` still works unchanged
- [ ] AC-3: `match_create({ opponent: 'destroyer' })` creates a match without error
- [ ] AC-4: `match_create({ opponent: 'bot-heuristic' })` still works (legacy alias)
- [ ] AC-5: `engine_bot_recommend({ state, tier: 'invalid-tier' })` returns `isError: true` listing valid tier names
- [ ] AC-6: `pnpm check` exits 0

## Definition of Done

- [ ] `engine_bot_recommend` input schema includes `tier?: BotTier`; handler maps tier to computeBotAction
- [ ] `match_create` accepts all 8 codenames; legacy aliases mapped
- [ ] Both tools' descriptions updated in mcp/README.md
- [ ] AC-2 and AC-4 regression verified
- [ ] `pnpm check` exits 0
- [ ] Committed on main
