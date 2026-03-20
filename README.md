# Phalanx Duel

Arm yourself for battle with spades and clubs and shields against your opponent.

Phalanx Duel is a tactical 1v1 card combat game.

This repository contains the core rules engine and the official web implementation as a TypeScript monorepo.

For documentation, see the [docs wiki](docs/README.md).

## Prerequisites

- Node.js `24` via `mise` (see `mise.toml`)
- pnpm (`corepack enable` to use the version pinned in `package.json`)

## Quick Start

```bash
mise install
corepack enable
pnpm install
pnpm test
```

## Local URLs (Ports)

Run in separate terminals:

```bash
pnpm dev:server
pnpm dev:client
```

Then use:

- Client app: `http://localhost:5173`
- Server health: `http://localhost:3001/health`
- Swagger UI: `http://localhost:3001/docs`
- OpenAPI JSON: `http://localhost:3001/docs/json`
- WebSocket endpoint: `ws://localhost:3001/ws`

## Environment Files

**Never commit `.env*` files.** Only `*.example` templates are safe to commit.
The pre-commit hook enforces this automatically.

| File | Purpose | Commit? |
|------|---------|---------|
| `.env` | Top-level env overrides | **No** — gitignored |
| `.env.local` | Local dev runtime defaults (admin credentials, `DATABASE_URL`, OTLP) | **No** — gitignored |
| `.env.release` | Release-time env overrides | **No** — gitignored |
| `.env.release.local` | Release Sentry tokens for deploy scripts | **No** — gitignored |
| `.env.release.example` | Template — empty values only | **Yes** — committed baseline |

Copy `.env.release.example` to `.env.release.local` and fill in values locally.
Never commit a file containing a real token, DSN, password, or `DATABASE_URL`.

- `SENTRY_DSN` is not required for normal local development.
- `PHALANX_ENABLE_LOCAL_SENTRY=1` opts the server into local Sentry reporting when a server DSN is present.
- `VITE_ENABLE_LOCAL_SENTRY=1` opts the client into local Sentry reporting when a client DSN is present.

## Local OTLP (SigNoz / OTel)

For local observability in dev/test, OTLP export works without requiring a Sentry DSN. If a Sentry DSN exists in an env file for release purposes, local runtime ignores it unless the local opt-in flag is set.

### Collector to SigNoz (recommended)

Run a local collector that:
- receives app OTLP signals
- tails `logs/server.log` (Fastify/Pino)
- forwards traces, metrics, and logs to SigNoz

Start the collector:

```bash
pnpm otel:signoz
```

Then run the server against the collector intake:

```bash
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4320
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
pnpm dev:server
```

If your SigNoz OTLP endpoint is different, set it before starting the collector:

```bash
SIGNOZ_OTLP_ENDPOINT=http://localhost:4318 pnpm otel:signoz
```

`OTEL_CONSOLE_LOGS_ENABLED` is optional. Keep it disabled if you only want Pino/Fastify logs and want to avoid duplicates.

Quick validation:

```bash
curl -i -X POST http://localhost:3001/matches
```

That endpoint emits a span (`http.createMatch`).

### Collector debug console (no SigNoz backend)

If you only want to print telemetry locally for debugging:

```bash
pnpm otel:console
```

Then point the server to collector intake:

```bash
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
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
- `docs/` — [Documentation wiki](docs/README.md): system, SEO, legal, history.
- `scripts/` — Build and CI/CD automation.

## Documentation

See the **[docs wiki](docs/README.md)** for all documentation.

Key entry points:

- [docs/system/](docs/system/README.md) — architecture, DoD, scripts, flags, types
- [Operations Runbook](docs/system/OPERATIONS_RUNBOOK.md) — triage, deployment, and incident response
- [AGENTS.md](AGENTS.md) — AI agent instructions and collaboration expectations
- [.github/CONTRIBUTING.md](.github/CONTRIBUTING.md) — contributor setup and validation workflow

## License

This repository is licensed under [GPL-3.0-or-later](LICENSE).
