# Phalanx

> [!IMPORTANT]
> **Project Migration**: The project has migrated to the **Phalanx** open tactical card system. The primary project home is now [https://phalanxduel.com](https://phalanxduel.com).

Arm yourself for battle with spades and clubs and shields against your opponent.

Phalanx is an open tactical card system designed for competitive and cooperative play. The canonical head-to-head competitive format is **Phalanx: Duel**.

This repository contains the core Phalanx rules engine and the official Phalanx: Duel web implementation as a TypeScript monorepo.

Multi-player (3+ players) is supported via **Phalanx: Arena**; see [docs/system/FUTURE.md](docs/system/FUTURE.md).

For game rules see [docs/formats/duel/RULES.md](docs/formats/duel/RULES.md) and the original [game design notes](resources/).

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
| `@phalanxduel/shared` | `shared/` | Zod schemas, generated types, JSON Schema snapshots, state hashing |
| `@phalanxduel/engine` | `engine/` | Pure deterministic rules engine (no I/O, no transport) |
| `@phalanxduel/server` | `server/` | Authoritative match server (Fastify + WebSocket + OpenTelemetry) |
| `@phalanxduel/client` | `client/` | Web UI (Vite + TypeScript) |

## CI Gates

All of the following must pass on every PR (see `.github/workflows/ci.yml`):

1. `pnpm lint`
2. `pnpm typecheck`
3. `pnpm test`
4. `pnpm schema:check`
5. `pnpm rules:check`

## Observability & Analytics

Phalanx employs a "Triad of Observability" for production monitoring:
1. **Sentry**: Forensic error tracking and performance profiling.
2. **PostHog**: Product analytics and user journey mapping.
3. **OpenTelemetry**: Low-level infrastructure metrics.

See [docs/system/OBSERVABILITY.md](docs/system/OBSERVABILITY.md) for setup and details.

## Documentation

### System
- [ARCHITECTURE.md](docs/system/ARCHITECTURE.md) — system design, event sourcing, data flow
- [PROTOCOL.md](docs/system/PROTOCOL.md) — HTTP and WebSocket wire protocol
- [TECHNICAL_REFERENCE.md](docs/system/TECHNICAL_REFERENCE.md) — technical reference and project philosophy
- [PRIVACY_AND_ETHICS.md](docs/system/PRIVACY_AND_ETHICS.md) — data handling, cookies, and ethical mandates
- [CONTRIBUTING.md](docs/system/CONTRIBUTING.md) — TDD-first workflow, CI gates
- [OBSERVABILITY.md](docs/system/OBSERVABILITY.md) — tracing, metrics, analytics

### Formats
- [RULES.md](docs/formats/duel/RULES.md) — Phalanx: Duel game rules with unique IDs for test mapping
- [HOWTOPLAY.md](docs/formats/duel/HOWTOPLAY.md) — Developer quickstart for playing a match locally
- [TESTPLAN.md](docs/system/TESTPLAN.md) — rule-to-test mapping

## Governance & Trademarks

- [GOVERNANCE.md](GOVERNANCE.md) — Project governance and format definitions
- [TRADEMARKS.md](TRADEMARKS.md) — Trademark/branding policy

## License

This repository uses a split-license model:

- Source code and generated schema artifacts: [GPL-3.0-or-later](LICENSE)
- Game/design media assets in `images/` and `resources/`:
  [CC BY-NC-SA 4.0](LICENSE-ASSETS)

See [COPYING](COPYING) for a concise summary.
