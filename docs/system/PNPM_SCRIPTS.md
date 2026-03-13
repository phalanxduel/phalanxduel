# PNPM Scripts

Reference for the root workspace `pnpm` scripts in [package.json](../../package.json).
Package-local scripts still live in each workspace package, but these are the
top-level entry points contributors and CI should use first.

## Core Validation

- `pnpm check:quick`
  Fast local verification: lint, typecheck, schema/rules/flags checks, docs
  artifact drift check, and markdown lint.
- `pnpm check:ci`
  Full CI verification: everything in `check:quick`, plus build, test, and
  format checks.
- `pnpm lint`
  Run ESLint across the repo.
- `pnpm lint:fix`
  Run ESLint with autofix.
- `pnpm format`
  Run Prettier in write mode.
- `pnpm format:check`
  Verify formatting without modifying files.
- `pnpm typecheck`
  Run TypeScript typechecking for all workspace packages.
- `pnpm test`
  Run all workspace test suites.

## Focused Test Commands

- `pnpm test:coverage`
  Run coverage suites for `shared`, `engine`, and `server`, then summarize the
  result.
- `pnpm test:engine`
  Run only engine tests.
- `pnpm test:server`
  Run only server tests.
- `pnpm test:shared`
  Run only shared-package tests.

## Schema and Rules Verification

- `pnpm schema:gen`
  Regenerate shared JSON schema artifacts from the shared package.
- `pnpm schema:check`
  Verify shared schema artifacts are current.
- `pnpm rules:check`
  Verify rules documentation and runtime FSM consistency.
- `pnpm flags:check`
  Verify feature-flag environment handling.

## Documentation Pipeline

- `pnpm docs:dependency-graph`
  Regenerate `docs/system/dependency-graph.svg` from dependency-cruiser using
  the pinned `@viz-js/viz` renderer.
- `pnpm docs:knip`
  Regenerate `docs/system/KNIP_REPORT.md` from Knip.
- `pnpm docs:artifacts`
  Refresh the dependency graph and Knip report together.
- `pnpm docs:build`
  Refresh docs artifacts and rebuild `docs/api` with TypeDoc.
- `pnpm docs:check`
  Rebuild docs artifacts and fail if checked-in artifacts drift.
- `pnpm docs:dash`
  Build the Dash docset from `docs/api`.

## Development and QA

- `pnpm dev:server`
  Start the server in watch mode.
- `pnpm dev:client`
  Start the client dev server.
- `pnpm setup:qa`
  Bootstrap the local QA environment.
- `pnpm qa:playthrough`
  Run one headless playthrough simulation.
- `pnpm qa:playthrough:batch`
  Run a small batch of playthrough simulations.
- `pnpm qa:playthrough:matrix`
  Run the playthrough matrix used by anomaly verification.
- `pnpm qa:playthrough:verify`
  Run the matrix plus anomaly verification.
- `pnpm qa:playthrough:ui`
  Run the UI-oriented playthrough script.
- `pnpm qa:anomalies`
  Analyze recent playthrough artifacts for failures and anomalies.

## Observability and Release

- `pnpm otel:console`
  Run the local OTEL console collector flow.
- `pnpm otel:signoz`
  Run the local collector flow for SigNoz.
- `pnpm sentry:release`
  Run the Sentry release tracking flow.
- `pnpm deploy:prod`
  Deploy production via the release script.
- `pnpm deploy:prod:watch`
  Deploy production and stream logs.

## Maintenance

- `pnpm diagnostics`
  Run the diagnostics report script.
- `pnpm version:sync`
  Synchronize version metadata across the repo. Pass `-- <semver>` to set an
  explicit version; otherwise the script bumps the current version to the next
  `-rev.N`.
- `pnpm deps:prune-store`
  Run `pnpm store prune` to remove unreferenced packages from the local pnpm
  store. CI runs this as part of the dependency pipeline.

## Guidance

- Prefer the root scripts over invoking workspace tools directly when an
  equivalent root script exists.
- Treat `pnpm docs:artifacts` and `pnpm docs:check` as part of the normal docs
  workflow, not optional extras.
- The dependency graph renderer is pinned via `@viz-js/viz`, so local and CI
  should produce the same SVG bytes.
- `pnpm deps:prune-store` mutates the local pnpm store cache. That is appropriate
  in CI and occasional local maintenance, but it should not be part of the fast
  inner-loop workflow.
