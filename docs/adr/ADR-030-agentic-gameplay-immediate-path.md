---
id: decision-030
title: 'DEC-2B-005 - Agentic gameplay immediate path: MCP client + bot opponent + llama analysis'
owner: Project Owner + Platform
date: '2026-05-10'
status: accepted
---

# DEC-2B-005 - Agentic gameplay immediate path: MCP client + bot opponent + llama analysis

## Context

The MCP server now exposes `match_create` and `action_submit` (ADR-029), making it
possible for AI agents to play live matches. The question is how to configure the first
end-to-end agentic game given what is available locally today.

Four architectural options were evaluated for "two AI agents playing each other":

| Option | Description | Status |
| --- | --- | --- |
| A | MCP client (Claude Code) drives player 1; built-in bot plays player 2 | **Selected** |
| B | Headless script drives full game with no human in loop | Not yet built |
| C | `engine_llm_recommend` — llama chooses moves instead of MCTS | Not yet built |
| D | Two LLM agents, one per side, two accounts | Larger scope, deferred |

The local environment has:

- llama.cpp running at `http://127.0.0.1:8080/v1` with qwen2.5-coder-7b
- `phalanx-local` MCP entry in `.mcp.json` with `ANALYSIS_PROVIDER=llama`,
  `TOOL_PROFILE=admin`, `GAME_SERVER_URL`, and `AGENT_TOKEN` passthrough
- `match_create`, `action_submit`, `engine_bot_recommend`, `match_analyze` all implemented
- `game://skills/play-a-turn` and `game://skills/analyze-a-match` resources available

The only missing prerequisite is a registered agent user account and its JWT in `AGENT_TOKEN`.

## Decision

Adopt **Option A** as the immediate path:

1. Register a dedicated agent user account on the local game server (one-time setup).
2. Export the JWT as `AGENT_TOKEN` before starting Claude Code.
3. In a Claude Code session with `phalanx-local` connected, instruct the agent to:
   - Read `game://skills/play-a-turn`
   - Call `match_create({ opponent: 'bot-mcts' })`
   - Loop: `engine_valid_actions` → `engine_bot_recommend(strategy='heuristic')` →
     `action_submit` until `state.phase === 'gameOver'`
   - Call `match_analyze(matchId, focus='turning_points')` → llama produces the breakdown

Move selection is handled by the engine (`engine_bot_recommend`). The LLM (llama) handles
post-game strategic analysis via `match_analyze`. This is the full loop that is
operational today without new code.

## Rationale

- **No new code required.** All tools and resources are already registered and tested.
- **Llama is in the loop** for the highest-value LLM task: strategic reasoning over the
  complete match, not individual move selection where latency would dominate.
- **MCTS is the stronger move selector.** For single-move decisions with a full engine
  available, MCTS at 200 iterations outperforms any small local LLM at the speed it can
  respond. Routing move selection through llama would add ~2–5 s latency per turn for
  lower-quality picks.
- **Unblocks cross-environment comparison.** Once an agent account exists locally, the
  same Claude Code session can replay the match against `phalanx-staging-public` using the
  same seed (ADR-029, `game://skills/compare-environments`).

## Consequences

- One dedicated agent account must be registered locally and its JWT exported before each
  session (or stored in a `.env.local` that is gitignored).
- Action selection quality is MCTS-based, not LLM-based. Llama-driven move selection is
  deferred to a future `engine_llm_recommend` tool.
- A fully headless automation script (Option B) is deferred; the loop runs inside Claude
  Code's tool-call chain rather than as a standalone Node process.

## Follow-on

| Item | Priority |
| --- | --- |
| `mcp/scripts/play-game.ts` — headless full-game runner, no human in loop | Medium |
| `engine_llm_recommend` tool — llama reasons about moves before selecting | Low |
| Two-account agent-vs-agent match | Low |

## Agent account bootstrap

```bash
# 1. Start the local stack (if not running)
pnpm dev

# 2. Register the agent account (once)
curl -s -X POST http://127.0.0.1:3001/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"agent@phalanxduel.local","password":"<strong-password>","gamertag":"AgentOne"}' \
  | jq .

# 3. Get a token and export it
export AGENT_TOKEN=$(curl -s -X POST http://127.0.0.1:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"agent@phalanxduel.local","password":"<strong-password>"}' \
  | jq -r '.token')

# 4. Verify the token is set
echo ${AGENT_TOKEN:0:20}...

# 5. Start Claude Code — phalanx-local will inherit AGENT_TOKEN automatically
claude
```

## Rejected alternatives

**Option C — llama chooses moves**: The local model adds 2–5 s per turn and currently
produces lower-quality move choices than MCTS at 200 iterations. The skill
(`game://skills/play-a-turn`) already documents how to swap in a different recommender
once this changes.

**Option D — two LLM agents**: Requires two registered accounts, the server accepting
external action submissions for both sides simultaneously, and coordination logic to
prevent one agent from submitting out of turn. Deferred until Option B (headless script)
is proven stable.
