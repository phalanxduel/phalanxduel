# Contributing to Phalanx Duel

## Prerequisites

- Node.js `24.14.0` (see [.node-version](.node-version))
- Corepack enabled so the pinned `pnpm` version is used

## Setup

```bash
corepack enable
pnpm install
```

## Local Development

Run the server and client in separate terminals:

```bash
pnpm dev:server
pnpm dev:client
```

Default local URLs:

- Client app: `http://localhost:5173`
- Server health: `http://localhost:3001/health`
- Swagger UI: `http://localhost:3001/docs`
- WebSocket endpoint: `ws://localhost:3001/ws`

## Validation

Run the fast project checks before opening a PR:

```bash
pnpm check:quick
```

For focused validation:

- `pnpm lint:md` for Markdown changes
- `pnpm rules:check` for rules and state-machine drift
- `pnpm schema:check` for shared schema snapshots
- `pnpm flags:check` for feature-flag environment validation

## Workspace Layout

- `shared/` data contracts, schemas, hashing, and shared utilities
- `engine/` deterministic game rules engine
- `server/` authoritative Fastify and WebSocket server
- `client/` Vite web client

## Documentation

- [README.md](README.md) for local setup and runtime notes
- [docs/RULES.md](docs/RULES.md) for the canonical game rules
- [docs/system/ARCHITECTURE.md](docs/system/ARCHITECTURE.md) for system design

## Pull Requests

- Keep changes scoped to a single concern.
- Update docs when behavior, commands, or operator workflows change.
- Add or update tests when behavior changes.
