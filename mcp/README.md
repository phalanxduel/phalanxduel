# Phalanx Duel MCP Server

Model Context Protocol server that exposes the Phalanx Duel game engine, match data, and semantic search to AI agents like Claude Code.

Supports two deployment modes:

- **stdio** — local process, full admin access (current Claude Code integration)
- **http** — remote HTTP server, profile-gated (public or admin tier)

## Tools

### Engine Tools (no DB required — always available)

| Tool | What it does |
|------|-------------|
| `engine_valid_actions` | List all legal moves for the active player |
| `engine_simulate_attack` | Preview attack outcome without mutating state |
| `engine_bot_recommend` | Get bot's recommended action (random/heuristic/mcts) |
| `engine_evaluate` | Score a position (0=losing, 0.5=balanced, 1=winning) |

### Data Tools (requires `DATABASE_URL` — public + admin)

| Tool | What it does |
|------|-------------|
| `match_list` | List recent completed matches with pagination |
| `match_get` | Fetch a match by ID with full state and outcome |
| `leaderboard` | Top players by ELO for pvp/sp-random/sp-heuristic/sp-mcts |
| `match_embeddings_list` | List matches with stored vector embeddings |

### Analysis Tools (requires API keys — admin only)

| Tool | What it does |
|------|-------------|
| `match_analyze` | Claude writes a strategic breakdown of a match |
| `match_embed` | Generate OpenAI embedding + store in `match_embeddings` |
| `match_find_similar` | pgvector cosine search: find strategically similar matches |

### Admin Tools (requires `DATABASE_URL` — admin only)

| Tool | What it does |
|------|-------------|
| `pipeline_status` | Match counts, embedding coverage, player activity — for env comparison |
| `match_purge` | Delete bot/abandoned matches by age (dry-run by default) |
| `bulk_embed` | Batch-embed all unembedded completed matches |
| `user_search` | Find users by gamertag prefix (includes email, elo, verified status) |

### Resources

| URI | Content |
|-----|---------|
| `game://rules` | Canonical rules specification (docs/gameplay/rules.md) |
| `game://development` | Dev guide: setup, inner loop, packages |

## Tool Profiles

`TOOL_PROFILE=public` — engine + data tools only. No auth required. Safe to expose publicly.

`TOOL_PROFILE=admin` — all tools. HTTP mode requires `Authorization: Bearer $MCP_ADMIN_TOKEN`.

## Local Setup (stdio)

```bash
# In repo root
pnpm install

# Required env vars
DATABASE_URL=postgres://...
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
```

The local server is configured in `.mcp.json` as `phalanx-local` with `TOOL_PROFILE=admin`.

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
      engine.ts        — Pure engine tools (no DB)
      data.ts          — DB read tools (matches, leaderboard, embeddings)
      analysis.ts      — Claude + OpenAI + pgvector tools
      admin.ts         — pipeline_status, match_purge, bulk_embed, user_search
    utils/
      matchSummary.ts  — shared match summary builder (used by analysis + admin)
  Dockerfile           — MCP-specific image (tsx runtime, no compiled build step)
  fly.public.toml      — Public Fly app (TOOL_PROFILE=public)
  fly.admin.toml       — Internal Fly app (TOOL_PROFILE=admin, no public port)
```

### Auth model

| Tier | Transport | Auth | Tools |
|------|-----------|------|-------|
| Public | HTTP | None | Engine + read-only data |
| Admin | HTTP | Bearer token | All tools |
| Local | stdio | OS process | All tools (no token needed) |

The firewall is **structural**: admin tools are never registered in the public profile process. A valid Bearer token sent to the public endpoint cannot reach admin handlers — they do not exist in that process.
