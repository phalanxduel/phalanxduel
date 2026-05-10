# Phalanx Duel MCP Server

Model Context Protocol server that exposes the Phalanx Duel game engine, match data, and semantic search to AI agents like Claude Code.

Supports two deployment modes:

- **stdio** — local process, full admin access (current Claude Code integration)
- **http** — remote HTTP server, profile-gated (public or admin tier)

## Tools

### Engine Tools (no DB required — always available)

| Tool | What it does |
| --- | --- |
| `engine_valid_actions` | List all legal moves for the active player |
| `engine_simulate_attack` | Preview attack outcome without mutating state |
| `engine_bot_recommend` | Get bot's recommended action (random/heuristic/mcts) |
| `engine_evaluate` | Score a position (0=losing, 0.5=balanced, 1=winning) |

### Data Tools (requires `DATABASE_URL` — public + admin)

| Tool | What it does |
| --- | --- |
| `match_list` | List recent completed matches with pagination |
| `match_get` | Fetch a match by ID with full state and outcome |
| `leaderboard` | Top players by ELO for pvp/sp-random/sp-heuristic/sp-mcts |
| `match_embeddings_list` | List matches with stored vector embeddings |

### Analysis Tools (admin only)

`match_analyze` works with inline state and requires **no database and no cloud API key** when
`ANALYSIS_PROVIDER=llama`. The embedding tools require both `DATABASE_URL` and `OPENAI_API_KEY`.

| Tool | Requires | What it does |
| --- | --- | --- |
| `match_analyze` | llama server **or** `ANTHROPIC_API_KEY` | Strategic breakdown: turning points, suit usage, board control |
| `match_embed` | `DATABASE_URL` + `OPENAI_API_KEY` | Generate embedding and store in `match_embeddings` |
| `match_find_similar` | `DATABASE_URL` + `OPENAI_API_KEY` | pgvector cosine search: find strategically similar matches |

### Gameplay Tools (admin only — requires `GAME_SERVER_URL` + `AGENT_TOKEN`)

These tools form the **agentic loop**: create a match, drive it turn-by-turn with engine
recommendations, and observe the outcome — all without leaving Claude Code.

| Tool | What it does |
| --- | --- |
| `match_create` | Create a match on the game server as the agent user; returns `matchId`, `playerId`, and initial `GameState` |
| `action_submit` | Rejoin a match and submit one action; returns the post-action `GameState` |

The full loop: `match_create` → (`engine_valid_actions` → `engine_bot_recommend` →
`action_submit`) × N turns → `match_analyze`.

See [docs/agents/agentic-gameplay.md](../docs/agents/agentic-gameplay.md) for workflow
examples and cross-environment comparison patterns.

### Admin Tools (requires `DATABASE_URL` — admin only)

| Tool | What it does |
| --- | --- |
| `pipeline_status` | Match counts, embedding coverage, player activity — for env comparison |
| `match_purge` | Delete bot/abandoned matches by age (dry-run by default) |
| `bulk_embed` | Batch-embed all unembedded completed matches |
| `user_search` | Find users by gamertag prefix (includes email, elo, verified status) |

### Resources

| URI | Content |
| --- | --- |
| `game://rules` | Canonical rules specification (docs/gameplay/rules.md) |
| `game://development` | Dev guide: setup, inner loop, packages |

## Tool Profiles

`TOOL_PROFILE=public` — engine + data tools only. No auth required. Safe to expose publicly.

`TOOL_PROFILE=admin` — all tools. HTTP mode requires `Authorization: Bearer $MCP_ADMIN_TOKEN`.

## Analysis Provider

`match_analyze` supports two backends selected at startup via `ANALYSIS_PROVIDER`:

### Local llama.cpp (default for `phalanx-local`)

```bash
ANALYSIS_PROVIDER=llama
LLAMA_BASE_URL=http://127.0.0.1:8080/v1   # OpenAI-compatible endpoint
LLAMA_MODEL=local                          # alias the llama server was started with
```

The local `.mcp.json` entry already sets these. As long as a llama.cpp server is running,
`match_analyze` works with no cloud API keys. Check available model aliases with:

```bash
curl http://127.0.0.1:8080/v1/models
```

The game state prompt is approximately 600–750 tokens — well within the context of any 7B+ model.

### Anthropic Claude (default for remote/CI)

```bash
ANALYSIS_PROVIDER=anthropic   # or omit (this is the default)
ANTHROPIC_API_KEY=sk-ant-...
```

Uses `claude-opus-4-7` with `max_tokens: 1024`. Required when no local inference server is
available. `ANTHROPIC_API_KEY` is **not** required when `ANALYSIS_PROVIDER=llama`.

## Local Setup (stdio)

The `.mcp.json` in the repo root configures a `phalanx-local` entry that starts the MCP server as
a child process. Engine tools work immediately with no extra setup. Each additional capability has
its own opt-in:

```bash
# Engine tools — no setup needed, always available

# Data + admin tools
export DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/phalanxduel"

# match_analyze via local llama.cpp (default in .mcp.json — no API key needed)
# Requires llama.cpp server running at http://127.0.0.1:8080

# match_analyze via Anthropic (alternative)
export ANTHROPIC_API_KEY="sk-ant-..."
# and change ANALYSIS_PROVIDER=anthropic in .mcp.json

# match_embed / match_find_similar
export OPENAI_API_KEY="sk-..."
```

Current `.mcp.json` (`phalanx-local` entry):

```json
{
  "type": "stdio",
  "command": "node",
  "args": ["--import", "tsx/esm", "mcp/src/server.ts"],
  "env": {
    "DATABASE_URL": "${DATABASE_URL}",
    "ANTHROPIC_API_KEY": "${ANTHROPIC_API_KEY}",
    "OPENAI_API_KEY": "${OPENAI_API_KEY}",
    "TOOL_PROFILE": "admin",
    "APP_ENV": "local",
    "ANALYSIS_PROVIDER": "llama",
    "LLAMA_BASE_URL": "http://127.0.0.1:8080/v1",
    "LLAMA_MODEL": "local"
  }
}
```

## Remote Deployment (Fly.io)

### Public endpoint

```bash
fly apps create phalanxduel-mcp-public
fly secrets set DATABASE_URL=... --app phalanxduel-mcp-public
fly deploy --config mcp/fly.public.toml
```

Accessible at `https://phalanxduel-mcp-public.fly.dev/mcp` — no auth required.

### Admin endpoint (internal only)

```bash
fly apps create phalanxduel-mcp-admin
fly secrets set \
  DATABASE_URL=... \
  MCP_ADMIN_TOKEN=... \
  ANTHROPIC_API_KEY=... \
  OPENAI_API_KEY=... \
  --app phalanxduel-mcp-admin
fly deploy --config mcp/fly.admin.toml
```

Not routed through Fly's public proxy. Access via tunnel:

```bash
fly proxy 8081:8080 --app phalanxduel-mcp-admin
```

Then `.mcp.json`'s `phalanx-prod-admin` entry (`http://127.0.0.1:8081/mcp`) is live.

## Multi-Environment Comparison

With all four `.mcp.json` entries active, you can ask Claude Code:

- "Compare the leaderboard on phalanx-prod-public vs phalanx-staging-public"
- "Show pipeline_status for phalanx-local and phalanx-prod-admin side by side"
  — `pipeline_status` returns match counts, embedding coverage, and recent activity per environment.
- "Find unembedded matches on prod and batch-embed them"
  — `pipeline_status` shows `unembedded` count; `bulk_embed` processes a batch.
- "Analyze this match using the local model" — pass an inline `state` to `match_analyze`;
  no database lookup needed, runs entirely against the local llama.cpp server.

## Architecture

```text
mcp/
  src/
    server.ts          — entry point: profile + transport dispatch
    db.ts              — Drizzle client (shared schema from server/src/db/schema.ts)
    resources.ts       — game://rules, game://development
    transport/
      http.ts          — HTTP server with Bearer auth middleware
    tools/
      engine.ts        — Pure engine tools (no DB, no API keys)
      data.ts          — DB read tools (matches, leaderboard, embeddings list)
      analysis.ts      — match_analyze: llama or Anthropic, no DB at module load
      embeddings.ts    — match_embed, match_find_similar: requires DB + OpenAI
      gameplay.ts      — match_create, action_submit: WS bridge to game server
      admin.ts         — pipeline_status, match_purge, bulk_embed, user_search
    utils/
      matchSummary.ts  — shared match summary builder (used by analysis + admin)
  demo-llama.ts        — end-to-end dev utility: verifies llama provider end-to-end
  Dockerfile           — MCP-specific image (tsx runtime, no compiled build step)
  fly.public.toml      — Public Fly app (TOOL_PROFILE=public)
  fly.admin.toml       — Internal Fly app (TOOL_PROFILE=admin, no public port)
```

### Module loading and DB dependency

`analysis.ts` has **no top-level DB import**. It loads cleanly without `DATABASE_URL`, making
`match_analyze` available even in environments that have no database (CI, local engine-only use,
inline state analysis). The DB is only accessed lazily inside `loadMatchState`, which is only
called when `matchId` is provided instead of an inline `state`.

`embeddings.ts` is imported inside the `if (DATABASE_URL)` guard in `server.ts`. It is never
instantiated if `DATABASE_URL` is absent, which means missing `OPENAI_API_KEY` does not prevent
the server from starting — it only prevents embedding tools from being registered.

### Auth model

| Tier | Transport | Auth | Tools |
| --- | --- | --- | --- |
| Public | HTTP | None | Engine + read-only data |
| Admin | HTTP | Bearer token | All tools |
| Local | stdio | OS process | All tools (no token needed) |

The firewall is **structural**: admin tools are never registered in the public profile process. A
valid Bearer token sent to the public endpoint cannot reach admin handlers — they do not exist in
that process.
