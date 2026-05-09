# Phalanx Duel MCP Server

Model Context Protocol server that exposes the Phalanx Duel game engine, match data, and semantic search to AI agents like Claude Code.

## What It Provides

### Engine Tools (no DB required)

| Tool | What it does |
|------|-------------|
| `engine_valid_actions` | List all legal moves for the active player |
| `engine_simulate_attack` | Preview attack outcome without mutating state |
| `engine_bot_recommend` | Get bot's recommended action (random/heuristic/mcts) |
| `engine_evaluate` | Score a position (0=losing, 0.5=balanced, 1=winning) |

### Data Tools (requires `DATABASE_URL`)

| Tool | What it does |
|------|-------------|
| `match_list` | List recent completed matches with pagination |
| `match_get` | Fetch a match by ID with full state and outcome |
| `leaderboard` | Top players by ELO for pvp/sp-random/sp-heuristic/sp-mcts |
| `match_embeddings_list` | List matches with stored vector embeddings |

### Analysis Tools (requires API keys)

| Tool | What it does |
|------|-------------|
| `match_analyze` | Claude writes a strategic breakdown of a match |
| `match_embed` | Generate OpenAI embedding + store in `match_embeddings` |
| `match_find_similar` | pgvector cosine search: find strategically similar matches |

### Resources

| URI | Content |
|-----|---------|
| `game://rules` | Canonical rules specification (docs/gameplay/rules.md) |
| `game://development` | Dev guide: setup, inner loop, packages |

## Setup

### Prerequisites

```bash
# In repo root
pnpm install

# Required env vars
DATABASE_URL=postgres://...
ANTHROPIC_API_KEY=sk-ant-...   # for match_analyze
OPENAI_API_KEY=sk-...          # for match_embed / match_find_similar
```

### Run the server

```bash
cd mcp
node --import tsx/esm src/server.ts
```

## Wiring it into Claude Code

Add to your project's `.claude/settings.local.json`:

```json
{
  "mcpServers": {
    "phalanx-duel": {
      "command": "node",
      "args": ["--import", "tsx/esm", "/path/to/game/mcp/src/server.ts"],
      "env": {
        "DATABASE_URL": "${DATABASE_URL}",
        "ANTHROPIC_API_KEY": "${ANTHROPIC_API_KEY}",
        "OPENAI_API_KEY": "${OPENAI_API_KEY}"
      }
    }
  }
}
```

Or globally in `~/.claude/settings.json` for the same.

## Dogfooding the Integration

Once wired into Claude Code, you can ask:

**"What are the valid moves in this game state?"**
— Paste a `GameState` JSON; `engine_valid_actions` returns the move list instantly.

**"Who's winning and why?"**
— `engine_evaluate` gives a 0–1 score with LP/board/hand breakdown.

**"What would the MCTS bot play here?"**
— `engine_bot_recommend` with `strategy=mcts` runs a 200-iteration tree search.

**"Show me the top 10 pvp players"**
— `leaderboard` with `mode=pvp` and `limit=10`.

**"Analyze match `<uuid>`"**
— `match_get` fetches the state, then `match_analyze` sends it to Claude for strategic commentary.

**"Find matches like 'spades-heavy aggressive opener with early LP damage'"**
— First run `match_embed` on candidate matches to populate embeddings, then `match_find_similar` does cosine search via pgvector.

## Architecture

```text
mcp/src/
  server.ts          — McpServer + StdioServerTransport entry point
  db.ts              — Drizzle client (shared schema from server/src/db/schema.ts)
  resources.ts       — game://rules, game://development
  tools/
    engine.ts        — Pure engine tools (no DB)
    data.ts          — DB read tools (matches, leaderboard, embeddings)
    analysis.ts      — Claude + OpenAI + pgvector tools
```

The MCP shares the server's Drizzle schema directly via relative import — no code duplication. The vector search uses pgvector's `<=>` cosine distance operator on the `match_embeddings.embedding vector(1536)` column (OpenAI `text-embedding-3-small`).
