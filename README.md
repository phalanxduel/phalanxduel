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

This repository uses a split-license model:

- Source code and generated schema artifacts: [GPL-3.0-or-later](LICENSE)
- Game/design media assets in `images/`: [CC BY-NC-SA 4.0](LICENSE-ASSETS)
