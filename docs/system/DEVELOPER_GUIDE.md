---
title: "Developer Guide"
description: "Friendly HowTos and FAQ for setup, local workflows, validation, QA scenarios, observability, Docker, and common developer tasks."
status: active
updated: "2026-03-31"
audience: contributor
related:
  - README.md
  - .github/CONTRIBUTING.md
  - docs/system/PNPM_SCRIPTS.md
  - docs/system/ENVIRONMENT_VARIABLES.md
  - docs/system/OPERATIONS_RUNBOOK.md
---

# Developer Guide

This is the canonical developer-facing HowTo and FAQ guide for the repo.

Use this document when you want answers to questions like:

- How do I get the repo running locally?
- Which command should I run before I commit?
- How do I run gameplay scenarios, API checks, or UI-driven QA?
- How do I regenerate docs or schema artifacts?
- How do I run local OTEL tooling?
- Which docs are canonical for deeper detail?

For exact script semantics, see [PNPM Scripts](./PNPM_SCRIPTS.md). For
environment-variable reference, see
[Environment Variables](./ENVIRONMENT_VARIABLES.md). For production operations,
use the [Operations Runbook](./OPERATIONS_RUNBOOK.md).

When command recommendations disagree, prefer `package.json`, `bin/check`, and
the canonical docs linked from this guide over older historical plan or review
documents.

## First-Time Setup

```bash
mise install
corepack enable
pnpm install
```

Recommended first validation:

```bash
pnpm verify:quick
```

If you need Playwright-backed QA:

```bash
pnpm qa:setup
```

## How To Run The App Locally

The repo supports two primary development workflows:

### 1. Docker-Based (Recommended)
This workflow is "local-free" and avoids port collisions by running all services inside Docker with hot-reloading enabled.

```bash
pnpm docker:up    # Start the environment
pnpm dev:dash     # Launch the Local Cockpit (interactive)
```

- **Operational Cockpit**: A real-time dashboard monitoring container health, observability pipelines, Git state, and service readiness.
- **Sync & Reflection**: Changes saved in your local editor are instantly synchronized into the container. `tsx watch` inside the container detects these changes and restarts the server automatically.
- **AI Agent Integration**: Agents can run `pnpm dev:status` to get a structured JSON snapshot of the environment, including failure diagnostics and active backlog tasks.
- **Observability Pipeline**: The cockpit tracks the flow from App → OTel Collector → Downstream. It treats the collector as a core architectural component.
- **Verification**: Run `pnpm dev:verify` for a deep diagnostic check of the stack.

### 2. Bare-Metal (Traditional)
Run the web app in multiple terminals on your host machine:

```bash
pnpm dev:server
pnpm dev:client
```

Common local URLs (regardless of workflow):
- Client app: `http://127.0.0.1:5173`
- Server health: `http://127.0.0.1:3001/health`
- Admin UI: `http://127.0.0.1:3002/`
- Swagger UI: `http://127.0.0.1:3001/docs`
- OpenAPI JSON: `http://127.0.0.1:3001/docs/json`
- WebSocket endpoint: `ws://127.0.0.1:3001/ws`

Admin UI, when needed:

```bash
pnpm dev:admin
```

`pnpm dev:server` and `pnpm dev:admin` now bootstrap the local Docker Compose
Postgres service automatically and connect over `127.0.0.1:5432` unless
`DATABASE_URL` is already set in the shell. They also apply the server
migrations automatically for the default local Compose database.

For the default local Compose database, bootstrap also seeds a development
administrator account:

- email: `mike@phalanxduel.com`
- password: `adminadmin`

You can refresh or override that account manually with:

```bash
pnpm admin:seed-dev
pnpm admin:seed-dev mike@phalanxduel.com adminadmin Mike
```

## How To Choose The Right Validation Command

Use `pnpm verify:quick` for the normal inner loop:

- Markdown, docs, or backlog-only changes
- small refactors that do not need full runtime verification
- early confidence before a broader check

Use `pnpm verify:all` when the change:

- crosses package boundaries
- changes runtime behavior
- touches generated artifacts or schemas
- needs tests and format validation, not just lint/type/doc checks

Use `bin/check` before you declare a substantial task complete. It is the
repo's unified full check and matches the completion bar described in
`AGENTS.md`.

## How To Run Focused Tests

Run all tests:

```bash
pnpm test:run:all
```

Run by package:

```bash
pnpm test:run:shared
pnpm test:run:engine
pnpm test:run:server
```

Run coverage when you need a coverage-shaped verification pass:

```bash
pnpm test:coverage:run
```

## How To Run Gameplay And QA Scenarios

Quick headless playthrough:

```bash
pnpm qa:playthrough:run -- --seed 20260331
```

Full gameplay verification matrix:

```bash
pnpm qa:playthrough:verify
```

Engine-only matrix for fast regression checks:

```bash
pnpm qa:matrix:auto
```

API-oriented scenarios against a running local server:

```bash
pnpm dev:server
pnpm qa:api:run
pnpm qa:api:matrix
```

UI-driven playthrough:

```bash
pnpm qa:playthrough:ui
```

The UI playthrough logs a per-game correlation record with the match ID, the
stored player sessions observed in both browsers, and the first matching server
trace ID found in `logs/server.log`.

Browser-driven runs also inject one shared `qa.run_id` into both client windows
and emit a stable `game.match` client span once `match.id` is known, so Tempo
queries can pivot on either key when comparing one simulated game end to end.
Each reconnect cycle also gets its own `ws.session_id` and `ws.reconnect_attempt`
attributes, while QA runners emit reconnect and stall patterns keyed by the same
`match.id`/`qa.run_id` pair.

All supported playthrough tools now emit OpenTelemetry under explicit QA
service names in LGTM:

- `phx-qa-simulate-headless`
- `phx-qa-api-playthrough`
- `phx-qa-simulate-ui`
- `phx-qa-verify-playthrough-anomalies`

They also emit shared `qa.run.*` metrics and `qa.pattern.*` anomaly events so
Grafana dashboards can compare gameplay health across runner types.

Useful local overrides:

```bash
WINDOW_WIDTH=1600 WINDOW_HEIGHT=1440 pnpm qa:playthrough:ui
DEVTOOLS=false pnpm qa:playthrough:ui
SLOW_MO_MS=150 pnpm qa:playthrough:ui
```

Useful LGTM filters for a single browser simulation:

- `resource.service.name="phx-qa-simulate-ui"`
- `qa.run_id="<playthrough-id>"`
- `name="game.match"`
- `match.id="<match-id>"`
- `ws.session_id="<socket-session-id>"`
- `ws.reconnect_attempt>0`

Authoritative gameplay investigation path:

- Use Tempo span search with `qa.run_id`, `match.id`, and `ws.session_id` when
  isolating one simulated game or one reconnect cycle.
- Use the `game.match` span as the stable browser root when you want one
  end-to-end match view instead of per-action spans.
- Treat Grafana dashboards and service-structure views as supplementary. They
  are useful for cross-service shape and runner comparisons, but they are not
  the authoritative surface for isolating one match because they depend on
  sampled remote-service edges rather than exact match-level filters.

## How To Work With Docs, Schemas, And Generated Artifacts

Regenerate schema artifacts:

```bash
pnpm schema:gen
```

Check schema drift:

```bash
pnpm schema:check
```

Refresh documentation artifacts:

```bash
pnpm docs:artifacts
```

This refreshes the tracked visualization artifacts under `docs/system`,
including the dependency graph, Knip report, site-flow SVGs, and the curated
sequence/domain Mermaid diagrams used by the Dash docset.

Rebuild the full generated docs surface:

```bash
pnpm docs:build
```

Generate the Dash.app docset entry point:

```bash
pnpm docs:dash
```

The Dash flow layers curated system pages on top of the generated API docs:

- `docs/api/dash/index.html` is the Dash landing page.
- `docs/api/dash/architecture.html` bundles the dependency graph, site-flow diagrams, and canonical sequence diagrams.
- `docs/api/dash/data-models.html` links the core schemas, audit-trail models, and runtime/persistence model map.
- `docs/api/dash/assets/` carries the SVG diagrams copied from `docs/system/`.

`pnpm docs:dash` requires the `dashing` CLI. If it is not installed, the script
still stages the curated HTML and diagram assets, but it will stop before
producing the final `.docset` bundle for Dash.app.

The compiled TypeDoc output under `docs/api/` is intended to stay current with
the exported type surfaces, schemas, and contract entry points. If the rendered
version or symbol surface drifts from the repo, treat that as a documentation
freshness bug and rebuild the generated docs.

Generate SDK artifacts from the OpenAPI surface:

```bash
pnpm sdk:gen
```

Generated libraries live under `sdk/`. Runnable non-TypeScript reference apps
or platform clients belong under `clients/`, for example
`clients/go/duel-cli/`.

Validate the first-class Go client from the repo root with:

```bash
pnpm go:clients:check
```

## How To Run Local OTEL Tooling

The supported topology is collector-first:

- apps export to a local or environment-local OTLP collector endpoint
- collectors own routing and transformation concerns
- all collector paths converge on the centralized LGTM backend

Collector debug console:

```bash
pnpm infra:otel:console
```

Local collector forwarding to the centralized backend:

```bash
pnpm infra:otel:collector
```

Then start the server with OTLP export enabled:

```bash
OTEL_EXPORTER_OTLP_ENDPOINT=http://127.0.0.1:4318 \
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf \
pnpm dev:server
```

If you need different collector ports or richer environment setup, check
[Environment Variables](./ENVIRONMENT_VARIABLES.md).

## How To Use Docker For Local Development

The Docker `dev` profile is optimized for active coding and debugging.

| Command | Purpose |
|---|---|
| `pnpm docker:up` | Starts Postgres, App (with `tsx watch`), and Admin services. |
| `pnpm dev:dash` | **Refined**: Live TypeScript console cockpit monitoring health, logs, git, and OTel. |
| `pnpm dev:status`| **AI-Friendly**: Outputs the environment state as machine-readable JSON. |
| `pnpm dev:verify`| **Deep Check**: Diagnostic harness to troubleshoot stack and toolchain parity. |
| `pnpm docker:logs`| Tail logs for the main application container. |
| `pnpm docker:rebuild`| Wipe volumes and rebuild images (use after changing dependencies). |
| `pnpm docker:down`| Stop services and remove volumes (clean slate). |

### Cockpit Statuses
- **HEALTHY**: All required services and observability components are ready.
- **DEGRADED**: Required services are running, but optional dependencies are down or validation is stale.
- **FAILED**: One or more required core services (Postgres, App, OTel Collector) are missing or unhealthy.
- **STALE**: Code has changed in the workspace since the last full `pnpm dev:verify` run.

## How To Work With Environment And Secret Flows

Audit staging or production environment drift:

```bash
pnpm env:audit:staging
pnpm env:audit:production
```

Push local env definitions:

```bash
pnpm env:push:staging
pnpm env:push:production
```

Bootstrap secrets from a live environment:

```bash
pnpm env:bootstrap:staging
pnpm env:bootstrap:production
```

Use these carefully. They are operational commands, not normal inner-loop
developer commands.

## How To Prepare For Release-Oriented Work

If you are touching deployment or release workflows:

1. Run `bin/check`.
2. Review [GitHub Automation](./GITHUB_AUTOMATION.md).
3. Review the [Operations Runbook](./OPERATIONS_RUNBOOK.md).
4. Review [Environment Variables](./ENVIRONMENT_VARIABLES.md) and any required
   local `.env*` files.

For actual deployment execution, prefer the production/staging run scripts in
`package.json` rather than ad hoc shell invocations:

```bash
pnpm deploy:run:staging
pnpm deploy:run:production
```

## FAQ

### Which doc should I read first?

- `README.md` for repo entry and quick start
- `.github/CONTRIBUTING.md` for contributor expectations
- this guide for scenario-driven developer workflows
- `docs/system/PNPM_SCRIPTS.md` when you need command-selection nuance

### I changed docs only. What should I run?

Start with:

```bash
pnpm lint:md
pnpm verify:quick
```

Use `bin/check` if the doc change affects generated artifacts, operational
instructions, or a larger documentation surface that could drift from code.

### I changed rules or gameplay logic. What should I run?

At minimum:

```bash
pnpm test:run:engine
pnpm test:run:server
pnpm qa:playthrough:verify
```

Then finish with `bin/check` before calling the work complete.

### Why do the docs prefer `127.0.0.1` instead of `localhost`?

The repo has had real local-dev issues around host binding and stale dev
servers. Using `127.0.0.1` keeps the common path explicit and avoids some
loopback ambiguity in local workflows.

### Where should new active documentation go?

- `docs/` for canonical reference docs
- `backlog/docs/` for active plans, audits, and process docs
- `backlog/decisions/` for decisions

Do not add parallel summary docs when a canonical surface already exists.
