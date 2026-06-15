# AI Agent Integration

Phalanx Duel exposes a full [Model Context Protocol](https://modelcontextprotocol.io/)
server. Any MCP-compatible AI agent can connect and immediately read game rules, evaluate
positions, query match data, and — with the right credentials — play live matches.

## Quick Start (No Setup Required)

Public endpoint — engine + data tools, no auth, no API keys:

```text
https://phalanxduel-mcp-public.fly.dev/mcp
```

Connect from any AI tool that supports MCP/HTTP and you instantly have:

- `game://rules` — full canonical rules specification
- `game://skills/*` — step-by-step playbooks for common agent tasks
- Engine tools: `engine_valid_actions`, `engine_simulate_attack`, `engine_evaluate`,
  `engine_bot_recommend`
- Data tools: `match_list`, `match_get`, `leaderboard`, `match_embeddings_list`

For repo-local gameplay automation discipline across browser and Godot QA
surfaces, read [Gameplay Automation Contract](./skills/gameplay-automation.md).
For repeatable local proof runs, use the `phalanx-end-to-end-playthrough`
skill. For Godot v2 UX migration work, use the `phalanx-godot-ux-parity`
skill and treat the browser/reference playthrough artifact as the parity oracle.

## Capability Tiers

| Tier | Requires | Unlocks |
| --- | --- | --- |
| **Public** | Nothing — connect to the public endpoint | Engine + read-only data + all resources |
| **Analysis** | `ANALYSIS_PROVIDER=llama` (local) or `ANTHROPIC_API_KEY` | `match_analyze` |
| **Embeddings** | `DATABASE_URL` + `OPENAI_API_KEY` | `match_embed`, `match_find_similar` |
| **Gameplay** | `GAME_SERVER_URL` + `AGENT_TOKEN` | `match_create`, `action_submit` |
| **Admin** | `DATABASE_URL` + `TOOL_PROFILE=admin` | `pipeline_status`, `match_purge`, `bulk_embed`, `user_search` |

## Connect by Tool

All configs below use the public read-only endpoint. Replace the URL with
`http://127.0.0.1:8081/mcp` (via `fly proxy`) and add a Bearer token for admin
access.

---

### Claude Code

Add to `.mcp.json` in your project root (works in any repo, not just this one):

```json
{
  "mcpServers": {
    "phalanx-public": {
      "type": "http",
      "url": "https://phalanxduel-mcp-public.fly.dev/mcp"
    }
  }
}
```

For full local dev access with gameplay tools, see `.mcp.json` in this repo root.

---

### Cursor

Add to `~/.cursor/mcp.json` (global) or `.cursor/mcp.json` (project-scoped):

```json
{
  "mcpServers": {
    "phalanx-public": {
      "type": "http",
      "url": "https://phalanxduel-mcp-public.fly.dev/mcp"
    }
  }
}
```

---

### Windsurf / Codeium

Add to `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "phalanx-public": {
      "serverUrl": "https://phalanxduel-mcp-public.fly.dev/mcp"
    }
  }
}
```

---

### Continue.dev

Add to `~/.continue/config.json` under `mcpServers`:

```json
{
  "mcpServers": [
    {
      "name": "phalanx-public",
      "transport": {
        "type": "http",
        "url": "https://phalanxduel-mcp-public.fly.dev/mcp"
      }
    }
  ]
}
```

---

### Zed

Add to `~/.config/zed/settings.json` under `context_servers`:

```json
{
  "context_servers": {
    "phalanx-public": {
      "settings": {},
      "source": "custom",
      "launch": {
        "command": "npx",
        "args": ["-y", "mcp-remote", "https://phalanxduel-mcp-public.fly.dev/mcp"]
      }
    }
  }
}
```

---

### OpenCode

Add to `opencode.json` in your project root:

```json
{
  "mcp": {
    "phalanx-public": {
      "type": "remote",
      "url": "https://phalanxduel-mcp-public.fly.dev/mcp"
    }
  }
}
```

---

### Aider

Aider supports MCP via a sidecar proxy. Start the proxy then point Aider at it:

```bash
npx -y mcp-proxy --port 3333 \
  --server phalanx-public \
  --url https://phalanxduel-mcp-public.fly.dev/mcp
```

Then in your Aider session:

```bash
aider --mcp-server http://127.0.0.1:3333
```

---

### VS Code + GitHub Copilot

Add to `.vscode/settings.json`:

```json
{
  "github.copilot.chat.mcp.enabled": true,
  "mcp": {
    "servers": {
      "phalanx-public": {
        "type": "http",
        "url": "https://phalanxduel-mcp-public.fly.dev/mcp"
      }
    }
  }
}
```

---

### Gemini CLI

Gemini CLI supports MCP servers via a config file. Add to `~/.gemini/settings.json`:

```json
{
  "mcpServers": {
    "phalanx-public": {
      "httpUrl": "https://phalanxduel-mcp-public.fly.dev/mcp"
    }
  }
}
```

---

### Any tool (generic HTTP)

The public MCP endpoint speaks standard [MCP Streamable HTTP](https://modelcontextprotocol.io/docs/concepts/transports).
Send a POST to `https://phalanxduel-mcp-public.fly.dev/mcp` with a valid
JSON-RPC 2.0 MCP payload. No auth header required.

Verify the connection:

```bash
curl -s -X POST https://phalanxduel-mcp-public.fly.dev/mcp \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' \
  | jq '.result.tools[].name'
```

Expected output: `engine_valid_actions`, `engine_simulate_attack`,
`engine_bot_recommend`, `engine_evaluate`, `match_list`, `match_get`,
`leaderboard`, `match_embeddings_list`.

---

### Local stdio (run the MCP server yourself)

If you have this repo checked out:

```bash
TOOL_PROFILE=public node --import tsx/esm mcp/src/server.ts
```

This gives the same public tool set without a network connection.

For full admin access (gameplay, analysis, embeddings):

```bash
TOOL_PROFILE=admin \
DATABASE_URL="postgresql://..." \
AGENT_TOKEN="eyJ..." \
GAME_SERVER_URL="http://127.0.0.1:3001" \
node --import tsx/esm mcp/src/server.ts
```

---

## Skills

Skills are step-by-step playbooks available as MCP resources. Any connected
agent can read them directly:

| Resource | What it teaches |
| --- | --- |
| `game://skills` | Index of all available skills |
| `game://skills/play-a-turn` | Get valid actions → recommend → submit |
| `game://skills/analyze-a-match` | Load a match and get a strategic breakdown |
| `game://skills/compare-environments` | Run the same scenario on local, staging, prod |
| `game://skills/generate-content` | Use game data to write docs, articles, reports |

An agent in any directory can do:

```text
Read game://skills/generate-content from phalanx-public
→ follow the instructions to write a blog post about suit strategy
```

## Connecting from Other Repositories

The public endpoint is a stable, always-on service. Add it to any project's
agent config and the agent immediately has game rules, engine access, and match
data as context — without cloning this repo or running any local services.

Use case example: an agent working on a blog or marketing site can read
`game://rules`, call `engine_simulate_attack` for concrete examples, and produce
accurate game documentation without any game-specific code on the content side.

## Local Development Setup

See [`docs/development.md`](../development.md) for the full local stack.
See [`docs/agents/agentic-gameplay.md`](agentic-gameplay.md) for the autonomous
play workflow (`match_create` → `action_submit` loop).
