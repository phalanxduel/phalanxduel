# Agentic Gameplay via MCP

This document describes how AI agents (Claude Code, custom scripts, or autonomous systems)
can play, evaluate, and compare Phalanx Duel matches using the MCP server.

See [ADR-029](../adr/ADR-029-mcp-agentic-gameplay-action-submit.md) for the architectural
decision record that governs this design.

## The Agentic Loop

A full autonomous turn looks like this:

```text
engine_valid_actions(matchId, state)
        ↓
engine_bot_recommend(state, strategy='mcts', iterations=200)
        ↓
action_submit(serverUrl, matchId, action)
        ↓
engine_evaluate(newState)   ← score the result, decide whether to continue
```

`engine_valid_actions` and `engine_bot_recommend` are pure engine tools — no
network, no database. `action_submit` is the only tool that touches the game
server. The loop can run entirely inside Claude Code with no external scripts.

## Setup

### 1. Agent identity

The agent authenticates as a dedicated registered user account. This is a
standard user — no special flags, no bypass of any game rules.

Get a JWT for the agent account:

```bash
# Log in as the agent user and capture the token
curl -s -X POST http://127.0.0.1:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"agent@phalanxduel.com","password":"..."}' \
  | jq -r '.token'
```

Export it before starting Claude Code:

```bash
export AGENT_TOKEN="eyJ..."
export GAME_SERVER_URL="ws://127.0.0.1:3001"
```

The `phalanx-local` MCP server entry in `.mcp.json` passes both through to the
MCP server process automatically.

### 2. Environment-scoped server URLs

Each `.mcp.json` entry has its own `GAME_SERVER_URL`. The tools inherit the URL
from the MCP server's environment, so you never pass it explicitly in tool
calls:

| MCP entry | GAME_SERVER_URL |
| --- | --- |
| `phalanx-local` | `ws://127.0.0.1:3001` |
| `phalanx-staging-public` | `wss://phalanxduel-staging.fly.dev` |
| `phalanx-prod-admin` | `wss://phalanxduel-production.fly.dev` |

## Tools

### `match_create`

Creates a new match as the agent user. The agent plays as player 1; `opponent`
sets player 2's strategy.

```text
Input:
  opponent   'bot-random' | 'bot-heuristic' | 'bot-mcts'  (default: 'bot-heuristic')
  seed       number  (optional — for reproducible matches)

Output:
  matchId    UUID
  state      GameState (initial)
```

Example: create a match against a heuristic bot, then analyze after

```text
match_create({ opponent: 'bot-heuristic' })
→ { matchId: "abc...", state: { phase: 'DeploymentPhase', ... } }
```

### `action_submit`

Submits a single action to a live match. Returns the new game state after
the action is applied.

```text
Input:
  matchId    UUID
  action     ActionSchema  (type, playerIndex, timestamp, + type-specific fields)

Output:
  state      GameState (post-action)
  ack        boolean
```

The tool opens a WebSocket, sends the action with a unique `msgId` for
reliable delivery, waits for the matching ack, and closes. Each call is
independent and stateless.

## Workflows

### Bot-vs-bot evaluation (local)

Run a complete game and analyze the outcome:

```text
1. match_create({ opponent: 'bot-mcts' })
   → matchId, initialState

2. Loop until state.phase === 'gameOver':
   a. engine_valid_actions(state)
   b. engine_bot_recommend(state, strategy='heuristic')
   c. action_submit(matchId, recommendedAction)
   d. engine_evaluate(newState)   ← log score each turn

3. match_analyze(matchId, focus='turning_points')
```

### Cross-environment comparison

Play the same scenario on local and staging; compare evaluation scores:

```text
# Against phalanx-local:
match_create({ opponent: 'bot-heuristic', seed: 42 }) → localMatchId
[play 10 turns, record engine_evaluate at each step]

# Against phalanx-staging-public (same seed):
match_create({ opponent: 'bot-heuristic', seed: 42 }) → stagingMatchId
[play same 10 turns, record engine_evaluate]

# Compare score curves — divergence indicates engine behavior difference
```

The seed parameter ensures the initial deck shuffle is identical, so
evaluation differences are attributable to engine logic, not randomness.

### Strategic depth comparison

Evaluate how MCTS depth affects win rate over N matches:

```text
For iterations in [50, 200, 500, 1000]:
  For N matches:
    match_create({ opponent: 'bot-mcts' })
    [play full game with engine_bot_recommend at current iterations]
    record outcome + match_analyze(focus='suit_strategy')
  → win rate, avg turn count, avg final LP delta
```

### Observing a human match (read-only)

For any in-progress match ID you have access to:

```text
engine_valid_actions(matchId, currentState)
engine_evaluate(currentState)
match_analyze(state=currentState, focus='endgame')
```

No `action_submit` needed — pure observation uses only engine tools.

## Authentication and Security

- The `AGENT_TOKEN` env var is set in the MCP server process environment.
  It is never passed through tool inputs and never appears in conversation
  history or MCP logs.
- The agent account is subject to all normal game server auth, rate limiting,
  and match rules. There is no privileged bypass.
- `match_create` and `action_submit` are admin-profile tools only
  (`TOOL_PROFILE=admin`). They are never available on the public endpoint.
- Each WebSocket connection is short-lived (single action then closed).
  No persistent connection state is held between tool calls.

## Implementation Notes

The `ws` npm package is used (not the Node 24 built-in `WebSocket`) because
the built-in browser-compatible API does not support custom request headers.
Bearer token authentication requires the `Authorization` header on the WebSocket
upgrade request, which only `ws` supports in Node.js.

See `mcp/src/tools/gameplay.ts` for the implementation.
