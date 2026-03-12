# Contributing to Phalanx Duel

## Prerequisites

- Node.js `24` via `mise` (see [mise.toml](../mise.toml))
- Corepack enabled so the pinned `pnpm` version is used
- Graphviz (`dot`) if you run docs artifact generation or `pnpm docs:check`

## Setup

```bash
mise install
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

Use the full CI-shaped verification when a change crosses package boundaries or
depends on generated build output:

```bash
pnpm check:ci
```

For focused validation:

- `pnpm lint:md` for Markdown changes
- `pnpm rules:check` for rules and state-machine drift
- `pnpm schema:check` for shared schema snapshots
- `pnpm flags:check` for feature-flag environment validation
- `pnpm docs:check` for dependency-graph and Knip report drift
- `pnpm deps:prune-store` for pnpm store cleanup

## Definition Of Done

The project-specific completion bar lives in
[`docs/system/DEFINITION_OF_DONE.md`](../docs/system/DEFINITION_OF_DONE.md).

Minimum expectation:

- `pnpm check:quick` passes for every change.
- `pnpm check:ci` is also required for cross-package, generated-artifact,
  runtime-behavior, or other higher-risk changes.
- Rules, schemas, replay/audit implications, observability, and rollback
  expectations are updated when the touched surface requires them.
- Backlog tasks and PRs are not complete without concrete, accessible
  verification evidence that another contributor can rerun.

## AI Collaboration

AI-assisted work is expected to follow
[`docs/system/AI_COLLABORATION.md`](../docs/system/AI_COLLABORATION.md).

Minimum expectation:

- Give agents well-scoped tasks with explicit acceptance criteria and
  verification commands.
- Treat AI output as untrusted until reviewed, tested, and validated.
- Keep instruction files short, consistent, and tied to canonical docs instead
  of duplicating or conflicting with them.

## Engineering Gotchas

- `pnpm check:quick` does not build or test workspace packages. After engine
  source changes that affect server/runtime behavior, run
  `pnpm --filter @phalanxduel/engine build` before server tests or use
  `pnpm check:ci`.
- When a test depends on `createInitialState` card IDs or exact replay
  reproduction, pass a fixed `drawTimestamp` in `GameConfig` to keep the run
  deterministic.
- If a rules-engine change needs several new immutable values threaded through a
  helper chain, prefer a small context object/interface over adding more
  positional parameters. ESLint caps function parameters at 6.
- Review [docs/system/RISKS.md](../docs/system/RISKS.md) before local QA if a
  change touches the dev-server, playthrough, or animation paths.

## Workspace Layout

- `shared/` data contracts, schemas, hashing, and shared utilities
- `engine/` deterministic game rules engine
- `server/` authoritative Fastify and WebSocket server
- `client/` Vite web client

## Documentation

- [README.md](../README.md) for local setup and runtime notes
- [docs/RULES.md](../docs/RULES.md) for the canonical game rules
- [docs/system/AI_COLLABORATION.md](../docs/system/AI_COLLABORATION.md) for human/AI collaboration expectations
- [docs/system/ARCHITECTURE.md](../docs/system/ARCHITECTURE.md) for system design
- [docs/system/DEFINITION_OF_DONE.md](../docs/system/DEFINITION_OF_DONE.md) for project completion criteria
- [docs/system/EXTERNAL_REFERENCES.md](../docs/system/EXTERNAL_REFERENCES.md) for the external sources behind repo policy
- [docs/system/PNPM_SCRIPTS.md](../docs/system/PNPM_SCRIPTS.md) for the root `pnpm` command reference
- [docs/review/PRODUCTION_PATH_REVIEW_GUIDELINE.md](../docs/review/PRODUCTION_PATH_REVIEW_GUIDELINE.md) for production-readiness criteria

Documentation artifact commands:

- `pnpm docs:artifacts` refreshes `docs/system/dependency-graph.svg` and `docs/system/KNIP_REPORT.md`
- `pnpm docs:build` refreshes those artifacts and rebuilds `docs/api`

## Pull Requests

- Keep changes scoped to a single concern.
- Update docs when behavior, commands, or operator workflows change.
- Add or update tests when behavior changes.
