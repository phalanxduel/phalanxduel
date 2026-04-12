---
id: TASK-146
title: Remove Sentry Runtime and Release Tooling
status: Done
assignee:
  - '@codex'
created_date: '2026-03-31 23:59'
updated_date: '2026-04-01 03:43'
labels: []
dependencies:
  - TASK-145
references:
  - >-
    docs/adr/decision-026 - DEC-2F-001 - OTel-native observability and
    Sentry deprecation.md
  - package.json
  - server/package.json
priority: high
ordinal: 62000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Remove the remaining active Sentry-specific tooling, package-manifest
dependencies, release hooks, and runtime-facing assumptions from the repo.

## Rationale

The deprecation decision is not real until the repo stops depending on Sentry
as a runtime, build, or release backend.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Sentry-specific scripts, helper flows, and package-manifest dependencies are removed or replaced.
- [x] #2 Runtime-facing Sentry assumptions are removed from active code/config surfaces that are still part of the supported architecture.
- [x] #3 The remaining active repo surfaces treat OTel plus the local collector and centralized LGTM stack as the only supported observability path.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- First migration slice removes dead or obviously transitional Sentry surfaces
  that do not require a wider docs rewrite:
  `server/package.json`'s dead `task:sentry-test` hook, root-package
  `onlyBuiltDependencies` entries for Sentry tooling, Sentry secret prompts in
  `scripts/setup-staging.sh`, and stale Sentry CSP allowances in
  `server/src/app.ts`.
- `Dockerfile.dhi` was confirmed to be abandoned hardened-image evaluation
  residue rather than a supported build path, so it was removed entirely
  instead of merely being stripped of Sentry hooks.
- Documentation-heavy references remain for `TASK-147`, and operator-language
  replacement remains for `TASK-148`.
- Final runtime/config cleanup updated `scripts/health-check.ts` to the OTel
  health payload and removed the last Sentry-specific wording from the shared
  telemetry comment and client debug verification test.

## Verification

- `pnpm exec markdownlint-cli2 AGENTS.md "backlog/tasks/task-145 - Workstream-OTel-native-Observability-Migration.md" "backlog/tasks/task-146 - Remove-Sentry-Runtime-and-Release-Tooling.md" "backlog/tasks/task-147 - Rewrite-Observability-Docs-and-Env-Contracts.md" "backlog/tasks/task-148 - Replace-Sentry-Operational-Semantics-with-OTel-LGTM.md" "backlog/tasks/task-149 - Final-Observability-Verification-Pass.md" --config .markdownlint-cli2.jsonc`
- `rg -n "@sentry/cli|@sentry-internal/node-cpu-profiler|task:sentry-test|SENTRY_AUTH_TOKEN" package.json server/package.json scripts/setup-staging.sh`
- `rg --files | rg '^Dockerfile\\.dhi$'`
- `rg -n "sentry.io|sentry-cdn|ingest.us.sentry.io" server/src/app.ts`
- `pnpm --filter @phalanxduel/server typecheck`
- `pnpm --filter @phalanxduel/client test -- --run client/tests/debug.test.ts`
- `rg -n -i "SENTRY_|sentry|otlphttp/sentry" scripts/health-check.ts shared/src/telemetry.ts client/tests/debug.test.ts`

## Do Not Break

- Do not remove observability entirely; replace vendor-specific assumptions with
  the supported OTel path.
<!-- SECTION:NOTES:END -->

## Expected Outputs

- Updated package manifests and scripts
- Removed Sentry-specific runtime/release hooks
- Cleaner observability dependency surface
