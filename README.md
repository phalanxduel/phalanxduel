# Phalanx Duel

Arm yourself for battle with spades and clubs and shields against your opponent.

Phalanx Duel is a tactical 1v1 card combat game.

This repository contains the core rules engine and the official web implementation as a TypeScript monorepo.

For authoritative game rules, see [docs/RULES.md](docs/RULES.md).

## Prerequisites

- Node.js >= 20
- pnpm (`corepack enable` to use the version pinned in `package.json`)

## Quick Start

```bash
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

## Local OTLP (SigNoz / OTel)

For local observability in dev/test, OTLP export works without requiring a Sentry DSN.

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

## Documentation

- [RULES.md](docs/RULES.md) — Canonical rules specification v1.0
- [ARCHITECTURE.md](docs/system/ARCHITECTURE.md) — system design, event sourcing, data flow
- [FUTURE.md](docs/system/FUTURE.md) — Ideas for future enhancements

## License

This repository is licensed under [GPL-3.0-or-later](LICENSE).
