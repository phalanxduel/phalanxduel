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
database-isolation guard, typecheck, docs checks, Markdown lint, and Prettier.
Runs natively on the host for speed.

`pnpm verify:full` — required when the change:

- crosses package boundaries
- depends on generated build output
- modifies shared schemas or generated artifacts
- changes runtime behavior across client/server boundaries

`verify:full` adds the full test suite, schema/rules/client checks, advisory
quality gates, replay/playthrough/visual QA, and formatting verification on top
of the shared verification phases. **This is the recommended command for final
local validation when the change crosses package or runtime boundaries.**

`pnpm verify:ci` — the protected CI truth gate. It runs lint, typecheck,
coverage-producing test suites, replay verification, playthrough anomaly
verification with warnings failing, docs checks, Markdown lint, and Prettier.
Use it before changes that affect runtime behavior, generated artifacts,
schemas, or gameplay trust. A separate protected CI job runs
`pnpm --filter @phalanxduel/server test:adversarial` against Postgres for
server-authority rejection coverage and
`pnpm --filter @phalanxduel/server test chaos` for protocol fuzzing and
hash-chain integrity verification.

Smoke checks such as `pnpm verify:quick`, `pnpm qa:playthrough`, and headed
`pnpm qa:playthrough:ui` are for fast feedback and diagnostics; they do not
replace the fairness truth gates for review-ready gameplay work.

## Command Ladder

The verification commands form a ladder of increasing confidence. Choose the lowest rung that covers your change.

| Command | When to use | What it runs |
| --- | --- | --- |
| `pnpm verify:quick` | Fast local feedback | build, lint, DB isolation guard, typecheck, docs, Markdown, Prettier |
| `pnpm verify:ci` | Pre-push / CI gate | lint, typecheck, coverage tests, replay + playthrough verification, docs |
| `pnpm verify:full` | Cross-package changes, schema edits, final local validation | everything in ci + schema:check, rules:check, go:clients:check, heavyweight QA simulations |
| `pnpm verify:release` | Release preparation only | schema:check, rules:check, go:clients:check, fairness + API integration verification |
| `pnpm verify:integration:api` | Full API integration with live server | docker-backed or bare-metal server, playthrough + replay verification |

`pnpm check` is the standard host-native completion gate. It runs
`pnpm verify:quick` and then the explicit all-package test suite via
`pnpm test:run:all`. Use `pnpm verify:full` when you also need the heavyweight
schema/rules/client/advisory QA gates.

### Generation vs Verification

Generation commands create or update files. Verification commands check for drift without (intentionally) making changes outside their own process.

| Generation | What it produces |
| --- | --- |
| `pnpm generate:artifacts` | build metadata + JSON schemas + doc artifacts in sequence |
| `pnpm infra:metadata` | `shared/src/build-metadata.ts` from environment |
| `pnpm schema:gen` | `shared/schemas/*.json` from `shared/src/schema.ts` |
| `pnpm docs:artifacts` | dependency graph, KNIP report, API route table |
| `pnpm openapi:gen` | OpenAPI JSON from server route annotations |
| `pnpm sdk:gen` | Go and TypeScript client SDKs |

Run `pnpm generate:artifacts` after editing schema types, adding routes, or changing package dependencies. Commit the results before running verification.

## Schema and Rules

- `pnpm schema:gen` — regenerate shared JSON Schema artifacts. Run after editing `shared/src/schema.ts`.
- `pnpm schema:check` — verify schema artifacts are current (runs generation then checks for uncommitted drift).
  Run before committing schema-touching changes, or let `verify:full` call it automatically.
- `pnpm rules:check` — verify rules docs, runtime FSM consistency, event log coverage, rule evidence, and the independent combat model. Runs four checks:
  `verify-doc-fsm-consistency.ts` (FSM/rules alignment), `verify-event-log.ts` (confirms every action type
  reachable from the engine produces a non-empty `PhalanxEvent[]`), and `verify-rule-evidence.ts` (validates
  stable rule IDs, evidence references, and generated traceability freshness), followed by
  `pnpm rules:combat-reference` (1,786,152 deterministic production/reference comparisons over the recorded
  finite proof domain). Run for
  any turn-lifecycle, state-machine, or event derivation change.
- `pnpm rules:combat-reference` — run the independent combat model checker directly. It verifies canonical
  cards, all combat mode combinations, exhaustive primitive transition domains, and the two-rank orchestration
  basis, then checks the recorded proof digest in `docs/quality/combat-reference-proof.json`.
- `pnpm rules:evidence:write` — regenerate `docs/quality/gameplay-rule-evidence.md` from the machine-readable
  registry after an intentional evidence update.

## QA Playthroughs

- `pnpm qa:playthrough` — single headless simulation. Use for quick smoke testing.
- `pnpm qa:playthrough:verify` — matrix run plus anomaly verification with warnings failing. **Required before marking gameplay or rules changes done.**
- `pnpm qa:playthrough:ui` — browser-driven headed simulation with two side-by-side Chromium windows, plus an optional third spectator window for stream/recording checks. It supports `--base-url`, `--scenario` (`guest-pvp`, `auth-pvp`, `guest-pvb`, `auth-pvb`), `--bot-opponent`, `--max-games`, `--max-moves`, `--starting-lp`, `--stall-threshold`, `--forfeit-chance`, `--slow-mo-ms`, `--window-width`, `--window-height`, `--window-gap`, `--window-top`, `--devtools`, `--no-devtools`, `--telemetry`, `--no-telemetry`, `--spectator`, `--no-spectator`, `--headed`, and `--headless`. It emits a per-game correlation record (`matchId`, player sessions, trace ID), injects one shared `qa.run_id` into both browser clients, and emits a stable `game.match` client span after match binding.
- `pnpm qa:playthrough:ui -- --swarm` — staged load-test mode that grows bot cohorts by `--cohort-growth fibonacci|fixed` or `--cohort-sizes`, reuses persistent identities from `--bot-identity-store`, and keeps bot inbox-friendly account names in the `bot+00001@phalanxduel.com` shape via `--bot-email-prefix` and `--bot-email-domain`. Use `--relogin-between-waves` to force logout/relogin cycles between cohorts.
- `pnpm qa:playthrough:tournament` — ranked mini-tournament browser QA. Reuses persistent tournament bot accounts by default from `artifacts/tournament-accounts.json`, registers any missing players, and supports `--no-persistent-players` for isolated throwaway-account runs.
  Pass `-- --seed NUMBER` to make run IDs, tournament pairing, match option selection, and bot action choices reproducible.

- `pnpm qa:ladder:simulate` — offline deterministic ladder season exercise. Generates a synthetic player population, fixed-seed match outcomes, Elo updates, standings, and JSON/Markdown reports under `artifacts/ladder/`.
- `pnpm qa:ladder:simulate -- --shadow-k-factors 16,32,48` — reruns candidate K-factor policies over the same seeded season and appends a shadow comparison table to the report.
- `pnpm qa:ladder:verify` — same ladder season exercise with lightweight sanity thresholds for rank-to-skill correlation and top-N overlap. Use as a local signal while thresholds mature; do not treat it as a replacement for service, route, or product-level ranked validation.
- `pnpm qa:engine:matrix` — engine-only simulation (bot-vs-bot). Fast, in-memory validation of game logic without requiring a browser or server.
- `tsx scripts/ci/verify-playthrough-anomalies.ts --fail-on-warn` — scans recent playthrough artifacts for logic drift or server errors. Fails on anomaly warnings when used as a fairness truth gate.

All playthrough tooling is expected to report under explicit QA service names in
LGTM and emit shared `qa.run.total`, `qa.run.duration_ms`,
`qa.run.turn_count`, `qa.run.action_count`, `qa.reconnect.total`, and
`qa.pattern.total` metrics where applicable.

### Playthrough Parameters

`bin/qa/simulate-headless.ts` accepts the full matrix-style scenario flags:

- `--p1`, `--p2` (`human` | `bot-random` | `bot-heuristic`): Define player types.
- `--damage-mode` (`classic` | `cumulative`): Set the combat rule.
- `--starting-lp` (1-500): Set player health.
- `--quick-start`: Skip the DeploymentPhase (default for auto modes).
- `--seed`: Fixed RNG seed for deterministic runs.
- `--screenshot-mode` (`turn` | `action` | `phase`): Capture frequency.

`bin/qa/simulate-ui.ts` accepts the headed-browser scenario flags:

- `--base-url`: target local/staging/production client URL.
- `--scenario`: `guest-pvp`, `auth-pvp`, `guest-pvb`, or `auth-pvb`.
- `--bot-opponent`: `bot-random` or `bot-heuristic` for PvB runs.
- `--max-games`, `--max-moves`, `--starting-lp`, `--stall-threshold`, `--forfeit-chance`.
- `--slow-mo-ms`, `--window-width`, `--window-height`, `--window-gap`, `--window-top`.
- `--devtools`, `--no-devtools`, `--telemetry`, `--no-telemetry`, `--spectator`, `--no-spectator`, `--headed`, `--headless`.

Use `--spectator` when validating streamable games. The runner opens a third
browser with the same `?watch=<matchId>` observer link used by live viewers and
checks the spectator HUD, live active-player banner, spectator count, and
play-by-play log while the player windows continue taking real turns.

Use `--no-telemetry` for remote browser validation when the collector is only
reachable from the host. The page will still emit gameplay logs, but browser
trace and metric export is disabled for that run so staging and production
origins do not trip a local-collector CORS failure.

Browser telemetry is now disabled by default outside localhost and can be
re-enabled with `--telemetry` when you explicitly want remote browser export.

Auth UI scenarios require a DB-backed environment where `/api/auth/register` is available. Guest-only local stacks can still validate `guest-pvp` and `guest-pvb`.

### Multi-Environment Testing

The simulation suite can be pointed to any environment (local dev, staging, or production) using the `--base-url` flag. Note the `--` separator required to pass flags through `pnpm`:

```bash
# Run the full playthrough matrix against production
rtk pnpm qa:playthrough:matrix -- --base-url https://phalanxduel.fly.dev

# Run a single smoke test against production with a bot opponent
rtk pnpm qa:playthrough -- --base-url https://phalanxduel.fly.dev --p1 human --p2 bot-heuristic

# Run the headed guest PvP browser harness against staging
rtk pnpm qa:playthrough:ui -- --base-url https://phalanxduel-staging.fly.dev --scenario guest-pvp

# Run headed guest PvP with a spectator stream window against staging
rtk pnpm qa:playthrough:ui -- --base-url https://phalanxduel-staging.fly.dev --scenario guest-pvp --spectator

# Run headed guest PvP against production without browser telemetry
rtk pnpm qa:playthrough:ui -- --base-url https://play.phalanxduel.com --scenario guest-pvp --no-telemetry

# Run the headed signed-in PvB browser harness against production
rtk pnpm qa:playthrough:ui -- --base-url https://play.phalanxduel.com --scenario auth-pvb --bot-opponent bot-heuristic
```

**Environment Compatibility:**
- **Browser-based modes** (`p1` or `p2` is `human`): These require a reachable server at the `--base-url`. They validate the full stack, including the Client UI, Server API, and Bot AI.
- **Engine-only modes** (both players are `bot-*`): These ignore `--base-url` as they import the game engine directly into the test runner. They are ideal for rapid regression testing of game rules but do not validate infrastructure.

## Release and Deployment

- `pnpm deploy:production` — orchestrates a full production release to Fly.io.
- `pnpm deploy:staging` — deploys the current branch to the staging environment.
- `pnpm version:sync` — ensures `package.json` versions across all workspaces match the root version.

### Production Release Workflow

1.  **Preparation**: Ensure `main` is up to date and all tests pass (`rtk bin/check`).
2.  **Execution**: `rtk env APP_ENV=production bash scripts/release/deploy-fly.sh`.
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

Run `rtk pnpm fix` before every commit to ensure the workspace remains hardened and clean.

## deps:prune-store

Mutates the local pnpm store cache. Appropriate in CI and occasional local maintenance — **not for the fast inner loop.**

## Generated Command Catalog

| Command | Definition |
| --- | --- |
| `admin:reset-password` | `tsx admin/scripts/reset-password.ts` |
| `admin:seed-dev` | `bash bin/maint/with-dev-postgres.sh pnpm admin:seed-dev:raw` |
| `admin:seed-dev:raw` | `tsx admin/scripts/seed-dev-admin.ts` |
| `agent:audit` | `tsx scripts/agent-audit.ts` |
| `benchmark:protocols` | `tsx bin/qa/benchmark-protocols.ts` |
| `build` | `pnpm infra:metadata && pnpm --filter @phalanxduel/shared build && pnpm -r build` |
| `check` | `pnpm verify:quick && pnpm test:run:all` |
| `db:diff-report` | `tsx scripts/maint/db-schema-diff.ts` |
| `deploy:production` | `APP_ENV=production bash scripts/release/deploy-fly.sh` |
| `deploy:staging` | `APP_ENV=staging bash scripts/release/deploy-fly.sh` |
| `dev:admin` | `pnpm --filter @phalanxduel/admin dev --host 127.0.0.1` |
| `dev:client` | `pnpm --filter @phalanxduel/client dev --host 127.0.0.1` |
| `dev:dashboard` | `tsx scripts/dev-dashboard.ts` |
| `dev:server` | `pnpm --filter @phalanxduel/server dev` |
| `dev:status` | `tsx scripts/dev-dashboard.ts --json` |
| `dev:verify` | `tsx scripts/dev-dashboard.ts --verify` |
| `diagnostics` | `bash bin/maint/report-diagnostics.sh` |
| `docker:cluster:down` | `docker-compose -f docker-compose.cluster.yml down -v` |
| `docker:cluster:logs` | `docker-compose -f docker-compose.cluster.yml logs -f` |
| `docker:cluster:up` | `docker-compose -f docker-compose.cluster.yml up --build -d` |
| `docker:qa:playthrough` | `bin/dock pnpm qa:api:run` |
| `docker:reclaim:machine` | `bash bin/maint/docker-reclaim-machine.sh` |
| `docker:shell` | `bin/dock bash` |
| `docker:test` | `bin/dock pnpm test` |
| `docker:up` | `docker-compose --profile dev up --build -d` |
| `docker:verify` | `bin/dock pnpm verify:full` |
| `docker:wipe` | `docker-compose --profile dev down -v` |
| `docs:artifacts` | `pnpm docs:dependency-graph && pnpm docs:knip && pnpm docs:routes` |
| `docs:build` | `pnpm docs:artifacts && typedoc` |
| `docs:check` | `bash scripts/ci/verify-doc-artifacts.sh` |
| `docs:dash` | `bash scripts/build/generate-docset.sh` |
| `docs:dependency-graph` | `bash scripts/docs/render-dependency-graph.sh` |
| `docs:knip` | `bash scripts/docs/render-knip-report.sh` |
| `docs:routes` | `pnpm --filter @phalanxduel/server docs:routes` |
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
| `env:rotate:production` | `tsx scripts/maint/sync-secrets.ts rotate production` |
| `env:rotate:staging` | `tsx scripts/maint/sync-secrets.ts rotate staging` |
| `fix` | `bin/maint/fix` |
| `format` | `prettier --write .` |
| `generate:artifacts` | `pnpm infra:metadata && pnpm --filter @phalanxduel/shared schema:gen && pnpm docs:artifacts` |
| `go:clients:check` | `bash scripts/ci/check-go-clients.sh` |
| `help` | `bash scripts/docs/show-help.sh \|\| echo "See docs/reference/pnpm-scripts.md"` |
| `infra:metadata` | `node --import tsx scripts/generate-build-metadata.ts` |
| `infra:otel:collector` | `bash bin/maint/run-otel-collector.sh` |
| `infra:otel:console` | `bash bin/maint/run-otel-console.sh` |
| `lint` | `bash scripts/ci/lint.sh code` |
| `lint:fix` | `ESLINT_SKIP_PROJECT_SERVICE=1 eslint . --fix` |
| `lint:md` | `markdownlint-cli2 "**/*.md" --config .markdownlint-cli2.jsonc` |
| `lint:tools` | `bash scripts/ci/lint.sh tools` |
| `lint:typed` | `bash scripts/ci/lint.sh typed` |
| `openapi:gen` | `pnpm tsx scripts/generate-openapi-file.ts && prettier --write docs/api/openapi.json` |
| `prepare` | `husky` |
| `qa:analyze` | `tsx bin/qa/simulate-headless.ts --p1 bot-heuristic --p2 bot-heuristic --headed --screenshot-mode action --max-turns 140` |
| `qa:api:continuous` | `bash scripts/ci/check-server.sh && tsx bin/qa/api-playthrough.ts --until-failure` |
| `qa:api:load-test` | `tsx bin/qa/api-playthrough.ts --concurrency 10 --batch 10 --max-turns 60 --damage-modes classic,cumulative --starting-lps 5,20` |
| `qa:api:matrix` | `bash scripts/ci/qa-matrix.sh api` |
| `qa:api:run` | `bash scripts/ci/check-server.sh && tsx bin/qa/api-playthrough.ts` |
| `qa:capture:gif` | `tsx bin/qa/capture-gameplay-gif.ts` |
| `qa:cluster:verify` | `tsx bin/qa/cluster-verify.ts` |
| `qa:cluster:verify:guarded` | `bash scripts/ci/check-server.sh 3011 127.0.0.1 http://127.0.0.1:3011/health && bash scripts/ci/check-server.sh 3012 127.0.0.1 http://127.0.0.1:3012/health && tsx bin/qa/cluster-verify.ts --server-a ws://127.0.0.1:3011/ws --server-b ws://127.0.0.1:3012/ws` |
| `qa:design-baseline` | `tsx bin/qa/capture-design-baseline.ts` |
| `qa:design-catalog` | `tsx bin/qa/generate-design-catalog.ts` |
| `qa:engine:matrix` | `bash scripts/ci/qa-matrix.sh engine` |
| `qa:fairness:verify` | `pnpm qa:playthrough:verify` |
| `qa:gallery` | `tsx bin/qa/capture-gallery.ts` |
| `qa:ladder:real` | `tsx bin/qa/ladder-real.ts` |
| `qa:ladder:serve` | `tsx bin/qa/ladder-serve.ts` |
| `qa:ladder:simulate` | `tsx bin/qa/ladder-season.ts` |
| `qa:ladder:verify` | `tsx bin/qa/ladder-season.ts --verify` |
| `qa:ladder:view` | `tsx bin/qa/ladder-view.ts` |
| `qa:matrix` | `bash scripts/ci/qa-matrix.sh full` |
| `qa:playthrough` | `tsx bin/qa/simulate-headless.ts` |
| `qa:playthrough:matrix` | `tsx bin/qa/simulate-headless.ts --p1 bot-random --p2 bot-heuristic --damage-modes classic,cumulative --starting-lps 1,20,100 --batch 2 --max-turns 180` |
| `qa:playthrough:run:batch` | `tsx bin/qa/simulate-headless.ts --batch 10` |
| `qa:playthrough:tournament` | `tsx bin/qa/simulate-ui.ts --mini-tournament --headed --scenario auth-pvb --starting-lp 3 --tournament-players 3 --tournament-starting-lp 3 --spectator` |
| `qa:playthrough:tournament:persistent` | `tsx bin/qa/simulate-ui.ts --mini-tournament --persistent-players --headed --scenario auth-pvb --starting-lp 3 --tournament-players 3 --tournament-starting-lp 3 --spectator` |
| `qa:playthrough:ui` | `tsx bin/qa/simulate-ui.ts` |
| `qa:playthrough:ui:desktop` | `pnpm qa:playthrough:ui -- --window-width 1600 --window-height 1440` |
| `qa:playthrough:ui:mobile` | `pnpm qa:playthrough:ui -- --window-width 390 --window-height 844` |
| `qa:playthrough:verify` | `bash scripts/ci/playthrough-verify.sh` |
| `qa:replay:verify` | `tsx bin/qa/replay-verify.ts` |
| `qa:setup` | `bin/qa/bootstrap.zsh` |
| `qa:swarm:staging` | `tsx bin/qa/simulate-headless.ts --base-url https://phalanxduel-staging.fly.dev --p1 bot-heuristic --p2 bot-heuristic --batch 10 --quick-start` |
| `qa:v1-baseline` | `tsx bin/qa/v1-baseline-capture.ts` |
| `qa:v1-phase-capture` | `tsx bin/qa/v1-phase-capture.ts` |
| `qa:v1-record` | `tsx bin/qa/v1-record-playthrough.ts` |
| `qa:visual:run` | `pnpm --filter @phalanxduel/root exec playwright test -c qa/visual-regression/playwright.config.ts` |
| `qa:visual:update` | `pnpm --filter @phalanxduel/root exec playwright test -c qa/visual-regression/playwright.config.ts --update-snapshots` |
| `quality:hotspots` | `tsx scripts/docs/quality-hotspots.ts` |
| `quality:status` | `tsx scripts/docs/quality-status.ts` |
| `release:prepare` | `bash scripts/release/release-prepare.sh` |
| `release:tag` | `bash scripts/release/release-tag.sh` |
| `rules:check` | `node --import tsx scripts/ci/verify-doc-fsm-consistency.ts && node --import tsx scripts/ci/verify-event-log.ts && node --import tsx scripts/ci/verify-rule-evidence.ts && pnpm rules:combat-reference` |
| `rules:combat-reference` | `node --import tsx scripts/ci/verify-combat-reference.ts` |
| `rules:evidence:write` | `node --import tsx scripts/ci/verify-rule-evidence.ts --write` |
| `schema:check` | `bash scripts/ci/verify-schema.sh` |
| `sdk:gen` | `pnpm tsx scripts/gen-sdk.ts` |
| `services` | `bash bin/services` |
| `test` | `pnpm test:run:all` |
| `test:coverage:report` | `tsx scripts/ci/verify-coverage.ts` |
| `test:coverage:run` | `bash scripts/ci/coverage.sh` |
| `test:replay` | `tsx bin/qa/api-replay-verify.ts` |
| `test:run:all` | `pnpm --filter @phalanxduel/shared build && pnpm --filter @phalanxduel/engine build && pnpm test:run:shared && pnpm test:run:engine && pnpm test:run:server && pnpm --filter @phalanxduel/client test && pnpm --filter @phalanxduel/admin test && pnpm --filter @phalanxduel/mcp test` |
| `test:run:engine` | `pnpm --filter @phalanxduel/engine test` |
| `test:run:server` | `pnpm --filter @phalanxduel/server test` |
| `test:run:shared` | `pnpm --filter @phalanxduel/shared test` |
| `typecheck` | `pnpm -r --filter '!@phalanxduel/root' typecheck` |
| `verify:boundaries` | `bash scripts/ci/verify-boundaries.sh` |
| `verify:ci` | `bash scripts/ci/verify.sh ci` |
| `verify:contracts` | `tsx scripts/ci/verify-contracts.ts` |
| `verify:db` | `bash scripts/ci/verify-db.sh` |
| `verify:db:isolation` | `bash scripts/ci/verify-db-isolation.sh` |
| `verify:full` | `bash scripts/ci/verify.sh full` |
| `verify:integration:api` | `bash scripts/ci/verify-integration-api.sh` |
| `verify:mutation` | `pnpm --filter @phalanxduel/engine exec stryker run` |
| `verify:perf` | `tsx bin/qa/verify-perf.ts` |
| `verify:perf:ws` | `k6 run tests/load/ws-smoke.js` |
| `verify:property` | `pnpm --filter @phalanxduel/engine test tests/property-fastcheck.test.ts` |
| `verify:quick` | `bash scripts/ci/verify.sh quick` |
| `verify:release` | `bash scripts/ci/verify.sh release` |
| `version:sync` | `bash bin/maint/sync-version.sh` |
