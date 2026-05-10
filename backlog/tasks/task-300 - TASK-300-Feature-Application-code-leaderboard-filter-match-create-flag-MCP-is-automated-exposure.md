---
id: TASK-300
title: 'TASK-300 - Feature: Application code — leaderboard filter, match_create flag, MCP is_automated exposure'
status: To Do
assignee: []
created_date: '2026-05-10'
updated_date: '2026-05-10'
labels:
  - feature
  - server
  - mcp
dependencies:
  - TASK-298
priority: high
milestone: m-13
---

## Description

Application code changes for is_automated. Scope: server leaderboard queries, WebSocket match creation flag, MCP tool updates. Does NOT deploy — that is TASK-301 (staging) and TASK-302 (production).

Work:
1. Server leaderboard queries: add `.where(eq(matches.isAutomated, false))` to all leaderboard queries
2. Server match-creation handler: set `is_automated = true` when `createMatch` WS message includes `isAgent: true`
3. `match_create` MCP tool: pass `isAgent: true` in createMatch payload
4. `match_list` MCP tool: add optional `isAutomated?: boolean` filter; include `isAutomated` in response
5. `match_get` MCP tool: include `isAutomated` in response

## Acceptance Criteria

- [ ] AC-1: Test DB with 3 human + 2 automated matches → `leaderboard()` returns results from only 3 human matches
- [ ] AC-2: `match_create` via MCP → `SELECT is_automated FROM matches WHERE id = '<matchId>'` returns `true`
- [ ] AC-3: `match_list({ isAutomated: true })` returns only automated; `isAutomated: false` returns only human; no filter returns all
- [ ] AC-4: `match_get` response includes `"isAutomated": true` for agent-created match
- [ ] AC-5: Pre-existing matches default to `is_automated = false`; leaderboard ranks unchanged
- [ ] AC-6: `pnpm check` exits 0

## Definition of Done

- [ ] All leaderboard queries filter `is_automated = false`
- [ ] Server match-creation handler writes `is_automated` based on `isAgent` flag
- [ ] `match_create` MCP tool sends `isAgent: true`
- [ ] `match_list` accepts/applies `isAutomated` filter; response includes field
- [ ] `match_get` response includes `isAutomated`
- [ ] Integration test: automated match excluded from leaderboard — passing
- [ ] `pnpm check` exits 0
- [ ] Committed on main (does NOT deploy)
