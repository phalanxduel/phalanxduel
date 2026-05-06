# Phalanx Duel

Arm yourself for battle with spades and clubs and shields against your opponent.

Phalanx Duel is a tactical 1v1 card combat game. This repository contains the core rules engine and the official web implementation as a TypeScript monorepo.

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js 24** (via `mise`)
- **pnpm 10+** (via `corepack`)
- **Postgres 17** (local or container)

### 2. Setup
```bash
rtk pnpm install
rtk pnpm qa:setup
```

### 3. Run
```bash
rtk pnpm services start all --tmux
```
The game will be available at [http://127.0.0.1:5173](http://127.0.0.1:5173).

For detailed setup, troubleshooting, and advanced workflows, see the **[Development Guide](docs/development.md)**.

## 📖 Documentation

The **[Documentation Wiki](docs/README.md)** is the central entry point for all project knowledge.

### Key Entry Points
- **[How to Play](docs/gameplay/how-to-play.md)** — Game rules and mechanics
- **[Development Guide](docs/development.md)** — Local setup, services, and workflows
- **[Testing & QA](docs/testing.md)** — Running tests, simulations, and playthroughs
- **[Configuration](docs/configuration.md)** — Environment variables and secrets
- **[Architecture](docs/architecture/principles.md)** — System design and boundaries
- **[Contributing](CONTRIBUTING.md)** — Workflow, standards, and PR expectations

## 🗺️ Monorepo Map

- `shared/` — Data contracts, schemas, and hashing
- `engine/` — Pure deterministic rules engine
- `server/` — Authoritative Fastify & WebSocket server
- `client/` — Vite-powered Web UI
- `sdk/` — Generated API client libraries
- `docs/` — Canonical documentation tree
- `backlog/` — Active task management and decisions

## ⚖️ License

Licensed under [GPL-3.0-or-later](LICENSE).
