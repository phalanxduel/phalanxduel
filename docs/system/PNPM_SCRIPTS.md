---
title: "PNPM Scripts — When to Use"
description: "Decision guidance for root pnpm scripts. Command implementations live in package.json; this captures non-obvious choices not derivable from script definitions."
status: active
updated: "2026-03-15"
audience: agent
authoritative_source: "package.json"
related:
  - .github/CONTRIBUTING.md
  - docs/system/DEFINITION_OF_DONE.md
---

# PNPM Scripts — When to Use

The full command list is in `package.json`. This document covers decision logic only.

## check:quick vs check:ci

`pnpm check:quick` — fast local validation: lint, typecheck, schema/rules/flags/docs drift, markdown lint. **Does not build or run tests.**

`pnpm check:ci` — required when the change:

- crosses package boundaries
- depends on generated build output
- modifies shared schemas or generated artifacts
- changes runtime behavior across client/server boundaries

`check:ci` adds build, test, and format checks on top of `check:quick`. Both run via Husky pre-commit; `check:ci` matches what CI runs.

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
- `pnpm qa:matrix:auto` — engine-only simulation (bot-vs-bot). Fast, in-memory validation of game logic without requiring a browser or server.
- `pnpm qa:anomalies` — scans recent playthrough artifacts for logic drift or server errors. Fails if server logs contain severe errors or if simulation manifests are missing.

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
pnpm qa:playthrough:run -- --base-url https://phalanxduel.fly.dev --p1 human --p2 bot-heuristic
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
    - The deployed app continues exporting telemetry through the local collector
      through the collector path to the centralized LGTM backend.

## Maintenance and Diagnostics

- `pnpm infra:otel:console` — runs the local OTEL collector in debug/console
  mode.
- `pnpm infra:otel:collector` — runs the local OTEL collector configured to
  forward to the centralized backend path.
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
