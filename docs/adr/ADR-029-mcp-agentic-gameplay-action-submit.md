---
id: decision-029
title: 'DEC-2B-004 - MCP agentic gameplay via action_submit'
owner: Project Owner + Platform
date: '2026-05-10'
status: accepted
---

# DEC-2B-004 - MCP agentic gameplay via action_submit

## Context

The MCP server already exposes a complete read-side loop for AI agents:

- `engine_valid_actions` — enumerate all legal moves for the active player
- `engine_bot_recommend` — get a recommended move at configurable depth
- `engine_evaluate` — score a position (0=losing, 0.5=balanced, 1=winning)
- `engine_simulate_attack` — preview an attack without committing it
- `match_analyze` — strategic breakdown via local llama or Anthropic
- `match_find_similar` — semantic search over prior matches

What the MCP server did not have is a **write path**: a way to submit a legal
action to a live match running on the game server. Without that path, the read
tools are purely observational — useful for analysis but insufficient for
autonomous or semi-autonomous play.

The system owner's workflow that drove this decision is:

> "I want to set up a match, let an agent play it using the engine's own
> evaluation, observe the outcome, and compare that behavior locally vs
> on staging vs on production — all from Claude Code, without writing one-off
> scripts."

Two options were on the table:

**Option A — MCP-layer action_submit tool**
Add `match_create` and `action_submit` MCP tools. Each tool opens a short-lived
WebSocket connection to the game server, exchanges the required messages, and
closes. Auth uses an `Authorization: Bearer` header on the WS upgrade. No game
server changes required.

**Option B — REST action endpoint on the game server**
Add an HTTP `POST /match/:id/action` endpoint to the Fastify server that
accepts a JSON action body and applies it. The MCP tool then calls this with
plain `fetch`. Simpler MCP-side implementation; requires a new game server
surface with its own auth contract.

## Decision

Implement **Option A**: `match_create` and `action_submit` as MCP tools that
submit via WebSocket.

The agent credentials model uses a dedicated bot-identity JWT (env var
`AGENT_TOKEN`) rather than the system owner's personal session. The token is
set per-environment in the MCP server's env and never flows through tool input.

## Rationale

**The comparison workflow requires the MCP layer.** The `.mcp.json` topology
already provides four named servers: `phalanx-local`, `phalanx-staging-public`,
`phalanx-prod-admin`, and `phalanx-staging-public`. A cross-environment match
comparison is a single Claude Code conversation that calls tools against
multiple server entries. Option B would have placed the write path in the game
server, divorcing it from the analysis and evaluation tools that live in the
MCP layer.

**No game server changes.** The WebSocket `action` message format and the
`createMatch` message format are already defined and stable. Adding a REST
endpoint would widen the game server's public API surface, require its own
auth and rate-limiting review, and couple the agentic gameplay feature to the
game server deploy cycle.

**ADR-027 alignment.** ADR-027 reserved HTTP action submission as the
degraded-mode fallback for unreliable clients, not the primary path for
agent play. Implementing Option B as the agent path would conflate two
distinct concerns and potentially constrain the degraded-mode design.

**Auth boundary is clean.** The game server already supports
`Authorization: Bearer` on WebSocket upgrades. A long-lived bot-identity JWT
(not tied to a human session cookie) is sufficient. The `AGENT_TOKEN` env var
lives in the MCP server's environment, never in tool inputs, and never crosses
the network in a user-visible field.

## Agent Identity Model

There is no `is_bot` flag on the users table. Bots are a match-level concept
(`matches.botStrategy`). An agent playing via MCP authenticates as a regular
registered user account whose gamertag signals its purpose (e.g.
`agent-local`, `agent-staging`).

The JWT for this account is provisioned once per environment:

```bash
# Generate agent JWT on local dev server
pnpm --filter @phalanxduel/server admin:seed-agent

# Set in shell before starting Claude Code
export AGENT_TOKEN="eyJ..."
```

`.mcp.json` passes this to each MCP server entry via `"AGENT_TOKEN":
"${AGENT_TOKEN}"`.

The agent account is a standard user. Game server auth, rate limiting, and
match rules apply identically. No privileged bypass exists.

## Tool Contract

### `match_create`

Creates a new match as the agent user. Returns `matchId` and the initial
`GameState`.

```text
matchCreate({ serverUrl, opponent, strategy, seed? })
  → { matchId, state }
```

`opponent` is `'bot-heuristic'` | `'bot-mcts'` | `'bot-random'`. For
bot-vs-bot evaluation, the agent plays player 1 while the server's built-in
bot plays player 2 at the specified strategy.

### `action_submit`

Submits a single action to a live match. Opens a WS connection, sends the
action with a stable `msgId`, waits for the matching ack, closes.

```text
actionSubmit({ serverUrl, matchId, action })
  → { ack, state }
```

`serverUrl` defaults to the `GAME_SERVER_URL` env var so callers do not need
to pass it explicitly when the MCP server is already environment-scoped.

## Consequences

- `mcp/src/tools/gameplay.ts` is added at the admin profile tier. It requires
  `AGENT_TOKEN` and `GAME_SERVER_URL` to be set; tools return a descriptive
  error if either is absent.
- `mcp/src/server.ts` registers gameplay tools inside the admin guard, parallel
  to analysis tools.
- The `ws` package is added to `mcp/package.json` (Node's built-in WebSocket
  does not support custom headers required for Bearer auth on WS upgrade).
- Each environment's `.mcp.json` entry gains `GAME_SERVER_URL` and
  `AGENT_TOKEN` env vars.
- An `admin:seed-agent` script will be added to the server package to
  provision the bot-identity JWT. Until it exists, operators generate the
  token manually via the existing login endpoint.
- The agentic loop (`engine_valid_actions` → `engine_bot_recommend` →
  `action_submit`) works entirely within Claude Code without any additional
  tooling.

## Follow-on Direction

1. `admin:seed-agent` script — provision stable bot-identity JWT per env
2. Cross-environment replay — snapshot a local match's action sequence and
   replay it against staging to isolate engine behavior differences
3. Autonomous tournament tool — run N matches at configurable strategy depth
   and return summary statistics
4. Spectator tool — `match_observe` that streams state updates from a live
   match without participating (read-only WS connection)

## Rejected Alternatives

### Option B — REST action endpoint on game server

Rejected because it requires modifying and deploying the game server, places
the write path outside the MCP comparison topology, and conflates the
agent-play path with the degraded-connectivity fallback reserved by ADR-027.

### Stateful persistent WS connection in MCP

Rejected because MCP tools are request-response. A persistent connection per
tool invocation would leak resources across tool calls and is incompatible with
the stateless HTTP transport used in the remote Fly.io deployment.

### Passing agent token through tool input

Rejected because it would expose the credential in every tool call's input
schema, making it visible in conversation history, logs, and MCP inspector
tools. Token stays in server env only.
