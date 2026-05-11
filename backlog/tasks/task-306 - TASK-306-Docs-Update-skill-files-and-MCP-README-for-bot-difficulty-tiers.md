---
id: TASK-306
title: 'TASK-306 - Docs: Update skill files and MCP README for bot difficulty tiers'
status: Done
assignee: []
created_date: '2026-05-10'
updated_date: '2026-05-10'
labels:
  - docs
  - mcp
dependencies:
  - TASK-305
priority: medium
milestone: m-13
---

## Description

Update agent-facing documentation to reflect the tier system.

Work:
1. `docs/agents/skills/play-a-turn.md`: add tier reference table (all 8 codenames, behavioral summary) under Method A
2. `docs/agents/skills/compare-environments.md`: update match_create examples to use tier codenames
3. `mcp/README.md`: gameplay tools section updated with tier names
4. `pnpm docs:artifacts`

## Acceptance Criteria

- [ ] AC-1: `game://skills/play-a-turn` resource contains markdown table with all 8 tier codenames and behavioral summaries
- [ ] AC-2: All compare-environments.md examples use tier codenames instead of bot-heuristic/bot-mcts
- [ ] AC-3: mcp/README.md match_create row describes `opponent` accepting tier codenames
- [ ] AC-4: `pnpm exec markdownlint-cli2 "docs/agents/skills/*.md" "mcp/README.md"` exits 0
- [ ] AC-5: Agent reading `game://skills/play-a-turn` from local MCP gets updated content

## Definition of Done

- [ ] `docs/agents/skills/play-a-turn.md` tier table added (all 8 codenames)
- [ ] `docs/agents/skills/compare-environments.md` examples updated
- [ ] `mcp/README.md` gameplay tools section updated
- [ ] `pnpm docs:artifacts` run; generated files committed
- [ ] Markdown lint passes
- [ ] Committed on main
