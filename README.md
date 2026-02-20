# Phalanx

Arm yourself for battle with spades and clubs and shields against your opponent.

Phalanx is a head-to-head combat card game for two players utilizing a standard
52-card deck. This repository contains the web implementation as a TypeScript
monorepo.

Multi-player (3+ players) is deferred; see [docs/FUTURE.md](docs/FUTURE.md).

For game rules see [docs/RULES.md](docs/RULES.md) and the original [game design notes](resources/).

## Prerequisites

- Node.js >= 20
- pnpm (`corepack enable` to use the version pinned in `package.json`)

## Quick Start

```bash
pnpm install
pnpm test
```

## Scripts

| Command | Description |
|---|---|
| `pnpm install` | Install all workspace dependencies |
| `pnpm build` | Build all packages (client Vite build) |
| `pnpm lint` | Run ESLint across the entire repo |
| `pnpm lint:fix` | Auto-fix lint issues |
| `pnpm format` | Format with Prettier |
| `pnpm format:check` | Check Prettier formatting |
| `pnpm typecheck` | Run `tsc --noEmit` in every package |
| `pnpm test` | Run all unit and integration tests |
| `pnpm test:engine` | Run engine tests only |
| `pnpm test:server` | Run server tests only |
| `pnpm test:shared` | Run shared tests only |
| `pnpm schema:gen` | Regenerate types and JSON Schema from Zod schemas |
| `pnpm schema:check` | Verify generated schema artifacts are up to date |
| `pnpm rules:check` | Verify every rule ID in RULES.md has a test reference |
| `pnpm dev:server` | Start server in dev mode (tsx watch) |
| `pnpm dev:client` | Start client Vite dev server |
| `pnpm setup:qa` | Install QA prerequisites (deps + Playwright browsers) |
| `pnpm qa:playthrough` | Run one automated browser playthrough with screenshots |
| `pnpm qa:playthrough:batch` | Run 10 automated seeded playthroughs with screenshots |
| `pnpm otel:up` | Start local observability stack (Docker) |
| `pnpm otel:down` | Stop local observability stack |

## Seeded QA Playthroughs

Automated walkthrough capture outputs are written to `artifacts/playthrough/` as:

- `screenshots/*.png`
- `manifest.json`
- `events.ndjson`

Example run:

```bash
pnpm qa:playthrough -- --seed 20260220 --base-url http://127.0.0.1:5173
```

Important: seeded match creation is for development/testing only. In production
(`NODE_ENV=production`), seeded `createMatch` requests are rejected with
`SEED_NOT_ALLOWED`.

## Workspace Packages

| Package | Path | Description |
|---|---|---|
| `@phalanx/shared` | `shared/` | Zod schemas, generated types, JSON Schema snapshots, state hashing |
| `@phalanx/engine` | `engine/` | Pure deterministic rules engine (no I/O, no transport) |
| `@phalanx/server` | `server/` | Authoritative match server (Fastify + WebSocket + OpenTelemetry) |
| `@phalanx/client` | `client/` | Web UI (Vite + TypeScript, placeholder) |

## CI Gates

All of the following must pass on every PR (see `.github/workflows/ci.yml`):

1. `pnpm lint`
2. `pnpm typecheck`
3. `pnpm test`
4. `pnpm schema:check`
5. `pnpm rules:check`

## Observability

The server initializes OpenTelemetry at startup. By default it logs to console.
Set `OTEL_EXPORTER_OTLP_ENDPOINT` to send to a collector:

```bash
# Start local OTel stack
pnpm otel:up

# Run server with OTel export
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318 pnpm dev:server
```

- Jaeger UI: http://localhost:16686
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3000

See [docs/OBSERVABILITY.md](docs/OBSERVABILITY.md) for details.

## Documentation

- [ARCHITECTURE.md](docs/ARCHITECTURE.md) — system design, event sourcing, data flow
- [RULES.md](docs/RULES.md) — game rules with unique IDs for test mapping
- [TESTPLAN.md](docs/TESTPLAN.md) — rule-to-test mapping
- [PROTOCOL.md](docs/PROTOCOL.md) — HTTP and WebSocket wire protocol
- [CONTRIBUTING.md](docs/CONTRIBUTING.md) — TDD-first workflow, CI gates
- [OBSERVABILITY.md](docs/OBSERVABILITY.md) — tracing, metrics, span attributes

## License

This repository uses a split-license model:

- Source code and generated schema artifacts: [GPL-3.0-or-later](LICENSE)
- Game/design media assets in `images/` and `resources/`:
  [CC BY-NC-SA 4.0](LICENSE-ASSETS)
- Trademark/branding policy: [TRADEMARKS.md](TRADEMARKS.md)

See [COPYING](COPYING) for a concise summary.
