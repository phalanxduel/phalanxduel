---
name: phalanx-agentic-gameplay
description: Operate Phalanx Duel through its MCP agentic gameplay surface. Use when Codex is asked to create or play matches as an agent, choose or submit turns, analyze a match, compare local/staging/production behavior, validate bot tiers, use engine MCP tools, or produce game-data-driven reports from `match_create`, `action_submit`, `engine_valid_actions`, `engine_bot_recommend`, `engine_llm_recommend`, `engine_evaluate`, `match_analyze`, `match_get`, `leaderboard`, or `pipeline_status`.
---

# Phalanx Agentic Gameplay

Use this skill when the game itself is the verification or analysis surface.
Prefer MCP engine tools for rules reasoning; use gameplay tools only when a live
server action is intended.

## Start Here

1. Read `mcp/README.md` for tool tiers and environment requirements.
2. Read `docs/agents/agentic-gameplay.md` for the live-action loop.
3. Read the specific playbook when relevant:
   - `docs/agents/skills/play-a-turn.md`
   - `docs/agents/skills/analyze-a-match.md`
   - `docs/agents/skills/compare-environments.md`
   - `docs/agents/skills/generate-content.md`

## Tool Choice

- Use pure engine tools when no live mutation is needed:
  `engine_valid_actions`, `engine_simulate_attack`, `engine_bot_recommend`,
  `engine_llm_recommend`, `engine_evaluate`.
- Use data tools for read-only match or leaderboard context:
  `match_list`, `match_get`, `leaderboard`, `match_embeddings_list`.
- Use gameplay tools only with an agent identity and intended live action:
  `match_create`, `action_submit`.
- Use admin tools only for operational work:
  `pipeline_status`, `match_purge`, `bulk_embed`, `user_search`.

## Agentic Loop

For a live agent match:

```text
match_create -> engine_valid_actions -> engine_bot_recommend
-> action_submit -> engine_evaluate -> repeat -> match_analyze
```

Use bot tiers (`scout`, `grunt`, `soldier`, `veteran`, `destroyer`,
`sentinel`, `blitz`, `champion`) when available. Use seeded matches for local
or staging comparisons; production blocks seeds, so compare aggregates there.

## Safety

- Never put `AGENT_TOKEN`, admin tokens, or user credentials in conversation
  history.
- Remember that the agent account is a normal player, not a privileged bypass.
- Do not call `action_submit` unless the user wants a live mutation or the task
  explicitly requires gameplay automation.
- Treat cross-environment divergence as a signal to inspect engine/version,
  state, RNG seed support, and deployment freshness before concluding a bug.

## Evidence

When reporting results, include the environment, match ID when available,
tool sequence, final phase/outcome, and any analysis focus used.
