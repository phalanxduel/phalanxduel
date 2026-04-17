---
title: "PNPM Scripts — When to Use"
description: "Decision guidance for root pnpm scripts. Command implementations live in package.json; this captures non-obvious choices not derivable from script definitions."
status: active
updated: "2026-03-15"
audience: agent
authoritative_source: "package.json"
related:
  - .github/CONTRIBUTING.md
  - docs/reference/dod.md
---

# PNPM Scripts — When to Use

The full command list is in `package.json`. This document covers decision logic only.

`pnpm verify:quick` — the repo's standard quick verification pass: build, lint,
typecheck, Go client checks, schema/rules/flags/docs drift checks, and markdown
lint. Runs natively on the host for speed.

`pnpm verify:full` — required when the change:

- crosses package boundaries
- depends on generated build output
- modifies shared schemas or generated artifacts
- changes runtime behavior across client/server boundaries

`verify:full` adds the full test suite and prettier verification on top of
`verify:quick`. **This is the recommended command for final local validation.**

## Schema and Rules

- `pnpm schema:gen` — regenerate shared JSON Schema artifacts. Run after editing `shared/src/schema.ts`.
- `pnpm schema:check` — verify artifacts are current. Run before committing schema-touching changes.
- `pnpm rules:check` — verify rules docs, runtime FSM consistency, and event log coverage. Runs two scripts:
  `verify-doc-fsm-consistency.ts` (FSM/rules alignment) and `verify-event-log.ts` (confirms every action type
  reachable from the engine produces a non-empty `PhalanxEvent[]`). Run for any turn-lifecycle, state-machine,
  or event derivation change.

## QA Playthroughs

- `pnpm qa:playthrough` — single headless simulation. Use for quick smoke testing.
- `pnpm qa:playthrough:verify` — matrix run plus anomaly verification. **Required before marking gameplay or rules changes done.**
- `pnpm qa:playthrough:ui` — browser-driven local simulation with two side-by-side Chromium windows. It emits a per-game correlation record (`matchId`, player sessions, trace ID), injects one shared `qa.run_id` into both browser clients, emits a stable `game.match` client span after match binding, and supports `WINDOW_WIDTH`, `WINDOW_HEIGHT`, `DEVTOOLS`, and `SLOW_MO_MS` environment overrides for local inspection.
- `pnpm qa:engine:matrix` — engine-only simulation (bot-vs-bot). Fast, in-memory validation of game logic without requiring a browser or server.
- `pnpm qa:anomalies` — scans recent playthrough artifacts for logic drift or server errors. Fails if server logs contain severe errors or if simulation manifests are missing.

All playthrough tooling is expected to report under explicit QA service names in
LGTM and emit shared `qa.run.total`, `qa.run.duration_ms`,
`qa.run.turn_count`, `qa.run.action_count`, `qa.reconnect.total`, and
`qa.pattern.total` metrics where applicable.

### Playthrough Parameters

The simulation scripts (`bin/qa/simulate-headless.ts`, `bin/qa/simulate-ui.ts`) accept several flags to control the scenario:

- `--p1`, `--p2` (`human` | `bot-random` | `bot-heuristic`): Define player types.
- `--damage-mode` (`classic` | `cumulative`): Set the combat rule.
- `--starting-lp` (1-500): Set player health.
- `--quick-start`: Skip the DeploymentPhase (default for auto modes).
- `--seed`: Fixed RNG seed for deterministic runs.
- `--screenshot-mode` (`turn` | `action` | `phase`): Capture frequency.

### Multi-Environment Testing

The simulation suite can be pointed to any environment (local dev, staging, or production) using the `--base-url` flag. Note the `--` separator required to pass flags through `pnpm`:

```bash
# Run the full playthrough matrix against production
pnpm qa:playthrough:matrix -- --base-url https://phalanxduel.fly.dev

# Run a single smoke test against production with a bot opponent
pnpm qa:playthrough -- --base-url https://phalanxduel.fly.dev --p1 human --p2 bot-heuristic
```

**Environment Compatibility:**
- **Browser-based modes** (`p1` or `p2` is `human`): These require a reachable server at the `--base-url`. They validate the full stack, including the Client UI, Server API, and Bot AI.
- **Engine-only modes** (both players are `bot-*`): These ignore `--base-url` as they import the game engine directly into the test runner. They are ideal for rapid regression testing of game rules but do not validate infrastructure.

## Release and Deployment

- `pnpm deploy:prod` — orchestrates a full production release to Fly.io.
- `pnpm deploy:staging` — deploys the current branch to the staging environment.
- `pnpm version:sync` — ensures `package.json` versions across all workspaces match the root version.

### Production Release Workflow

1.  **Preparation**: Ensure `main` is up to date and all tests pass (`bin/check`).
2.  **Execution**: `APP_ENV=production bash scripts/release/deploy-fly.sh`.
    - This script automatically runs `bin/maint/sync-version.sh` to bump the version.
    - It builds documentation artifacts and commits the version bump.
    - It tags the release in Git and pushes to `origin main`.
    - It executes `fly deploy` using `fly.production.toml`.
      through the collector path to the centralized LGTM backend.

## Maintenance and Diagnostics

- `pnpm infra:otel:console` — runs the local OTEL collector in debug/console
  mode.
- `pnpm infra:otel:collector` — runs the local OTEL collector configured to
  forward to the centralized backend path.
- `pnpm docs:site-flow` — refreshes the tracked Mermaid SVG diagrams under
  `docs/system/`, including the site-flow views plus the curated gameplay,
  persistence, observability, and domain-model diagrams used by the Dash
  docset.
- `pnpm docs:dash` — stages a Dash.app-friendly landing page plus architecture,
  flow, and data-model pages on top of `docs/api`, then builds the `.docset`
  when the `dashing` CLI is available. The staged inputs live under
  `docs/api/dash/`; `dashing.json` is generated by the script and should be
  treated as a build input, not hand-maintained reference documentation.
- `pnpm diagnostics` — generates a comprehensive Markdown report of the local system environment, project context, Git state, and resource usage. Use this when reporting issues.
- `pnpm fix` — **Recommended for AI Agents.** This is a "self-healing" script that runs a comprehensive suite of fixers:
  - `eslint --fix` for code logic and style.
  - `prettier --write` for consistent formatting.
  - `actionlint` for GitHub Actions correctness.
  - `taplo fmt` for TOML configuration files.
  - Custom `sed` sanitizers for common AI artifacts (e.g., removing `...` placeholders).

Run `pnpm fix` before every commit to ensure the workspace remains hardened and clean.

## deps:prune-store

Mutates the local pnpm store cache. Appropriate in CI and occasional local maintenance — **not for the fast inner loop.**

## Generated Command Catalog

| Command | Definition |
| --- | --- |
| `admin:reset-password` | `tsx admin/scripts/reset-password.ts` |
| `admin:seed-dev` | `bash bin/maint/with-dev-postgres.sh pnpm admin:seed-dev:raw` |
| `admin:seed-dev:raw` | `tsx admin/scripts/seed-dev-admin.ts` |
| `build` | `pnpm infra:metadata && pnpm -r build` |
| `check` | `pnpm verify:full` |
| `deploy:run:production` | `APP_ENV=production bash scripts/release/deploy-fly.sh` |
| `deploy:run:staging` | `APP_ENV=staging bash scripts/release/deploy-fly.sh` |
| `dev:admin` | `pnpm --filter @phalanxduel/admin dev --host 127.0.0.1` |
| `dev:client` | `pnpm --filter @phalanxduel/client dev --host 127.0.0.1` |
| `dev:dashboard` | `tsx scripts/dev-dashboard.ts` |
| `dev:server` | `pnpm --filter @phalanxduel/server dev` |
| `dev:status` | `tsx scripts/dev-dashboard.ts --json` |
| `dev:verify` | `tsx scripts/dev-dashboard.ts --verify` |
| `diagnostics` | `bash bin/maint/report-diagnostics.sh` |
| `docker:qa:playthrough` | `bin/dock pnpm qa:api:run` |
| `docker:reclaim:machine` | `bash bin/maint/docker-reclaim-machine.sh` |
| `docker:shell` | `bin/dock bash` |
| `docker:test` | `bin/dock pnpm test` |
| `docker:up` | `docker compose --profile dev up --build -d` |
| `docker:verify` | `bin/dock pnpm verify:full` |
| `docker:wipe` | `docker compose --profile dev down -v` |
| `docs:artifacts` | `pnpm docs:dependency-graph && pnpm docs:knip` |
| `docs:build` | `pnpm docs:artifacts && typedoc` |
| `docs:check` | `bash scripts/ci/verify-doc-artifacts.sh` |
| `docs:dash` | `bash scripts/build/generate-docset.sh` |
| `docs:dependency-graph` | `bash scripts/docs/render-dependency-graph.sh` |
| `docs:knip` | `bash scripts/docs/render-knip-report.sh` |
| `env:audit:production` | `tsx scripts/maint/sync-secrets.ts audit production` |
| `env:audit:staging` | `tsx scripts/maint/sync-secrets.ts audit staging` |
| `env:bootstrap:production` | `tsx scripts/maint/sync-secrets.ts bootstrap production` |
| `env:bootstrap:staging` | `tsx scripts/maint/sync-secrets.ts bootstrap staging` |
| `env:prune:production` | `tsx scripts/maint/sync-secrets.ts prune production` |
| `env:prune:staging` | `tsx scripts/maint/sync-secrets.ts prune staging` |
| `env:push:production` | `tsx scripts/maint/sync-secrets.ts push production` |
| `env:push:staging` | `tsx scripts/maint/sync-secrets.ts push staging` |
| `env:remove:production` | `tsx scripts/maint/sync-secrets.ts remove production` |
| `env:remove:staging` | `tsx scripts/maint/sync-secrets.ts remove staging` |
| `fix` | `bin/maint/fix` |
| `format` | `prettier --write .` |
| `go:clients:check` | `bash scripts/ci/check-go-clients.sh` |
| `help` | `bash scripts/docs/show-help.sh` |
| `infra:metadata` | `tsx scripts/generate-build-metadata.ts` |
| `infra:otel:collector` | `bash bin/maint/run-otel-collector.sh` |
| `infra:otel:console` | `bash bin/maint/run-otel-console.sh` |
| `lint` | `eslint . -f json -o eslint-report.json \|\| eslint .` |
| `lint:fix` | `eslint . --fix` |
| `lint:md` | `markdownlint-cli2 "**/*.md" --config .markdownlint-cli2.jsonc` |
| `openapi:gen` | `pnpm tsx scripts/generate-openapi-file.ts` |
| `prepare` | `husky` |
| `qa:api:run` | `bash scripts/ci/check-server.sh && tsx bin/qa/api-playthrough.ts` |
| `qa:playthrough` | `tsx bin/qa/simulate-headless.ts` |
| `qa:playthrough:ui` | `tsx bin/qa/simulate-ui.ts` |
| `services` | `bash bin/services` |
| `test` | `pnpm test:run:all` |
| `typecheck` | `pnpm -r typecheck` |
| `verify:full` | `echo '--- [PHASE 0: Build Identity] ---' && pnpm infra:metadata && echo '--- [PHASE 1: Linting] ---' && pnpm lint && echo '--- [PHASE 2: Type Checking] ---' && pnpm typecheck && echo '--- [PHASE 3: Unit Testing] ---' && pnpm test:run:all && echo '--- [PHASE 4: Tooling & Schema] ---' && pnpm go:clients:check && pnpm --filter @phalanxduel/shared schema:gen && bash scripts/ci/verify-schema.sh && tsx scripts/ci/verify-doc-fsm-consistency.ts && tsx scripts/ci/verify-event-log.ts && tsx scripts/ci/verify-feature-flag-env.ts && echo '--- [PHASE 5: Documentation & Formatting] ---' && pnpm docs:check && pnpm lint:md && prettier --check .` |
| `verify:quick` | `pnpm build && pnpm lint && pnpm typecheck && pnpm go:clients:check && pnpm --filter @phalanxduel/shared schema:gen && bash scripts/ci/verify-schema.sh && tsx scripts/ci/verify-doc-fsm-consistency.ts && tsx scripts/ci/verify-event-log.ts && tsx scripts/ci/verify-feature-flag-env.ts && pnpm docs:check && pnpm lint:md` |
| `version:sync` | `bash bin/maint/sync-version.sh` |
