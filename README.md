# Phalanx Duel

Arm yourself for battle with spades and clubs and shields against your opponent.

Phalanx Duel is a tactical 1v1 card combat game.

This repository contains the core rules engine and the official web implementation as a TypeScript monorepo.

For documentation, see the [docs wiki](docs/README.md).

## Prerequisites

- Node.js `24` via `mise` (see `mise.toml`)
- pnpm (`corepack enable` to use the version pinned in `package.json`)
  - Running `bash bin/maint/corepack-setup.sh` ensures a non-interactive setup.

## Quick Start (Native Host)

The recommended development workflow is **host-native** for maximum performance and hot-reload responsiveness.

### 1. Prerequisites
- Node.js 22+ & pnpm 10+
- PostgreSQL (native or via `brew`)
- OTel Collector (native or container)

### 2. Setup
```bash
rtk pnpm install
rtk cp .env.local.example .env.local
# Update DATABASE_URL in .env.local if needed
```

### 3. Run
The game uses a native background service manager that orchestrates all development processes. You can manage `server`, `client`, and `admin` concurrently:

```bash
rtk pnpm services start all --tmux  # Starts all services grouped cleanly in a tmux session
# OR
rtk pnpm services start all -d      # Starts them conventionally as detached background daemons
```

Monitor or manipulate individual services naturally:
```bash
rtk pnpm services logs server       # Tail background logs in daemon mode
rtk pnpm services attach            # Attach to your tmux system if using --tmux
rtk pnpm services reload server     # Hot-reloads configuration (via SIGHUP) without process death
rtk pnpm services status            # Check what's running
rtk pnpm services stop all          # Gracefully spin down all process trees
```

The game UI will be available at [http://127.0.0.1:5173](http://127.0.0.1:5173).

## Verification & Automation (Docker)

Docker is reserved for **isolated verification**, **automated QA**, and **production parity**.

### 1. Run Tests in Container
```bash
rtk bin/dock pnpm test
```

### 2. Full Verification
```bash
rtk bin/dock pnpm verify:full
```

### 3. Automated Playthrough
```bash
rtk pnpm qa:playthrough:ui -- --scenario guest-pvp  # Native headed browser run
rtk pnpm qa:playthrough:ui -- --scenario guest-pvp --spectator  # Headed run with observer window
rtk pnpm qa:playthrough:ui -- --swarm --scenario auth-pvp --wave-count 5  # Staged bot cohort load test
# OR
rtk bin/dock pnpm qa:playthrough:ui -- --scenario guest-pvp  # Containerized
```

## Environment Files

**Never commit `.env*` files.** Only `*.example` templates are safe to commit.
The pre-commit hook enforces this automatically.

| File | Purpose | Commit? |
|------|---------|---------|
| `.env` | Top-level env overrides | **No** — gitignored |
| `.env.local` | Local dev runtime defaults (admin credentials, `DATABASE_URL`, OTLP) | **No** — gitignored |
| `.env.release` | Release-time env overrides | **No** — gitignored |
| `.env.release.local` | Release-time deploy overrides for local scripts | **No** — gitignored |
| `.env.release.example` | Template — empty values only | **Yes** — committed baseline |

Copy `.env.release.example` to `.env.release.local` and fill in values locally.
Never commit a file containing a real token, DSN, password, or `DATABASE_URL`.

## Local OTLP (Centralized LGTM / OTel)

For local observability in dev/test, OTLP export works directly against the
local collector and centralized LGTM stack. No vendor-specific DSN or local
opt-in flag is part of the supported workflow.

### Collector to centralized LGTM (recommended)

Run a local collector that:
- receives app OTLP signals
- tails `logs/server.log` (Fastify/Pino)
- forwards traces, metrics, and logs to the centralized LGTM stack

Start the collector:

```bash
pnpm infra:otel:collector
```

Then run the server against the collector intake:

```bash
OTEL_EXPORTER_OTLP_ENDPOINT=http://127.0.0.1:4320
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
pnpm dev:server
```

If your centralized LGTM OTLP endpoint is different, set it before starting the collector:

```bash
LGTM_OTLP_ENDPOINT=http://127.0.0.1:4318 pnpm infra:otel:collector
```

`OTEL_CONSOLE_LOGS_ENABLED` is optional. Keep it disabled if you only want Pino/Fastify logs and want to avoid duplicates.

Quick validation:

```bash
curl -i -X POST http://127.0.0.1:3001/matches
```

That endpoint emits a span (`http.createMatch`).

### Collector debug console (no upstream backend)

If you only want to print telemetry locally for debugging:

```bash
pnpm infra:otel:console
```

Then point the server to collector intake:

```bash
OTEL_EXPORTER_OTLP_ENDPOINT=http://127.0.0.1:4318
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
pnpm dev:server
```

## Workspace Packages

| Package | Path | Description |
|---|---|---|
| `@phalanxduel/shared` | `shared/` | Zod schemas, generated types, JSON Schema snapshots, state hashing |
| `@phalanxduel/engine` | `engine/` | Pure deterministic rules engine (no I/O, no transport) |
| `@phalanxduel/server` | `server/` | Authoritative match server (Fastify + WebSocket + OpenTelemetry) |
| `@phalanxduel/client` | `client/` | Web UI (Vite + TypeScript) |

## Monorepo Map

- `backlog/` — Active task management, implementation plans, and architectural decisions.
- `bin/` — Operational and maintenance scripts (QA, OTEL, Versioning).
- `clients/` — External client applications and platform-specific first-class clients.
- `docs/` — [Documentation wiki](docs/README.md): system, SEO, legal, history.
- `sdk/` — Generated API client libraries and spec-derived artifacts.
- `scripts/` — Build and CI/CD automation.

## Documentation

See the **[docs wiki](docs/README.md)** for all documentation.

Key entry points:

- [Documentation Wiki](docs/README.md) — architecture, DoD, scripts, flags, types
- [Developer Guide](docs/tutorials/developer-guide.md) — setup, local workflows, QA scenarios, observability, FAQ
- [Glossary](docs/reference/glossary.md) — canonical definitions for game and system terminology
- [Operations Runbook](docs/ops/runbook.md) — triage, deployment, and incident response
- [CHANGELOG.md](CHANGELOG.md) — pre-release milestones and notable repo changes
- [.github/SECURITY.md](.github/SECURITY.md) — vulnerability reporting and supported-version policy
- [AGENTS.md](AGENTS.md) — AI agent instructions and collaboration expectations
- [.github/CONTRIBUTING.md](.github/CONTRIBUTING.md) — contributor setup and validation workflow

## License

This repository is licensed under [GPL-3.0-or-later](LICENSE).
