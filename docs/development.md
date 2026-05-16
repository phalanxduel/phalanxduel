# Local Development Guide

This guide covers everything you need to get Phalanx Duel running on your local machine for development, debugging, and contribution.

## Prerequisites

The project uses `mise` to manage runtime versions and `pnpm` for package management.

- **Node.js 24**: Managed via `mise` (see `mise.toml`).
- **pnpm 10+**: Corepack is used to pin the version.
- **PostgreSQL 17+**: Required for the server and admin components.
- **OpenTelemetry Collector**: Optional but recommended for local observability.

### One-Time Setup

```bash
# Install mise (if not already installed)
# see https://mise.jdx.dev/

# Install runtimes
mise install

# Enable corepack and install dependencies
corepack enable
pnpm install

# Setup Playwright for UI testing
pnpm qa:setup
```

## Hybrid Development Model

Phalanx Duel uses a hybrid model to balance developer velocity with deployment reliability.

### 1. Host-Native Development (Primary)
The fastest way to develop. Components run directly on your host machine.

```bash
# Start all services in a tmux session (Recommended)
rtk pnpm services start all --tmux

# Attach to the tmux session to see all logs
rtk pnpm services attach

# Alternative: Start as background daemons
rtk pnpm services start all -d
rtk pnpm services status
```

Individual service commands:
- `pnpm dev:server`: Starts the Fastify/WebSocket server.
- `pnpm dev:client`: Starts the Vite development server.
- `pnpm dev:admin`: Starts the Admin UI.

### 2. Containerized Verification (Docker)
Docker is used for isolated verification and ensuring CI parity.

```bash
# Run tests in a container
rtk bin/dock pnpm test

# Full verification pass
rtk bin/dock pnpm verify:full
```

## Local Configuration

Copy the example environment files and update them as needed:

```bash
cp .env.example .env.local
```

See [Configuration Guide](./configuration.md) for a detailed reference of all environment variables.

## Database Management

The server automatically runs migrations on startup in development mode if using the default local Postgres.

Manual commands:
- `pnpm --filter @phalanxduel/server db:migrate`: Run migrations.
- `pnpm admin:seed-dev`: Seed a development administrator account (`mike@phalanxduel.com` / `adminadmin`).

## Observability

Phalanx Duel uses OpenTelemetry. For local debugging, you can run a local collector to see traces and logs.

```bash
# Start the OTel console (prints telemetry to terminal)
rtk pnpm infra:otel:console

# Start the OTel collector (forwards to centralized LGTM)
rtk pnpm infra:otel:collector
```

The application is configured to export to `http://127.0.0.1:4318` by default.

### Database Monitoring (PgHero)

You can run a local PgHero instance to monitor database performance and slow queries.

```bash
# Start PgHero sidecar
docker compose up -d pghero
```

Access the dashboard at `http://127.0.0.1:8081`.

**Note:** For full insights, ensure `pg_stat_statements` is enabled in your Postgres instance:
```sql
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
```

## MCP Server (AI Agent Access)

The `mcp/` package exposes the game engine and match data to AI agents via the
[Model Context Protocol](https://modelcontextprotocol.io/). Claude Code uses it automatically when
`.mcp.json` is present in the repo root.

### Local Setup (stdio)

Engine tools work with zero setup. Each additional capability is opt-in:

| Capability | What to provide |
| --- | --- |
| Engine tools (`engine_*`) | Nothing — always available |
| Data + admin tools | `DATABASE_URL` in shell |
| `match_analyze` via local llama | llama.cpp server running at `http://127.0.0.1:8080` |
| `match_analyze` via Anthropic | `ANTHROPIC_API_KEY` + `ANALYSIS_PROVIDER=anthropic` in `.mcp.json` |
| `match_embed` / `match_find_similar` | `DATABASE_URL` + `OPENAI_API_KEY` |

The `.mcp.json` at the repo root configures `phalanx-local` with `TOOL_PROFILE=admin` and
`ANALYSIS_PROVIDER=llama` — so `match_analyze` uses the local llama.cpp server by default, with no
cloud API key required:

```json
{
  "mcpServers": {
    "phalanx-local": {
      "type": "stdio",
      "command": "node",
      "args": ["--import", "tsx/esm", "mcp/src/server.ts"],
      "env": {
        "DATABASE_URL": "${DATABASE_URL}",
        "TOOL_PROFILE": "admin",
        "APP_ENV": "local",
        "ANALYSIS_PROVIDER": "llama",
        "LLAMA_BASE_URL": "http://127.0.0.1:8080/v1",
        "LLAMA_MODEL": "local"
      }
    }
  }
}
```

Set these in your shell before starting Claude Code for full access:

```bash
export DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/phalanxduel"
export OPENAI_API_KEY="..."   # optional — enables match_embed and match_find_similar
```

### Tool Profiles

| Profile | Tools available | Use case |
| --- | --- | --- |
| `public` | Engine + read-only data | Shared / untrusted access |
| `admin` | All tools including mutation and analysis | Local development, ops |

The firewall between profiles is structural: admin tools are never instantiated in the public process.

See [mcp/README.md](../mcp/README.md) for the full tool reference, analysis provider configuration,
and remote deployment instructions.

## Common Workflows

### Making a Change
1.  Ensure you are on `main`.
2.  Make your changes.
3.  Run `pnpm verify:quick` to check linting and types.
4.  Run focused tests for the package you modified (e.g., `pnpm test:run:engine`).

### Preparing a PR
1.  Run `pnpm verify:quick`.
2.  Run `pnpm qa:playthrough:verify` for gameplay changes.
3.  Update documentation if you changed behavior or added a new feature.
