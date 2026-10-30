---
id: TASK-279
title: Harden OTel exporter behavior when collector is unavailable
status: Done
assignee:
  - '@codex'
created_date: '2026-05-05 16:02'
updated_date: '2026-05-05 16:06'
labels:
  - observability
  - ci
  - bug
dependencies: []
references:
  - server/src/instrument.ts
  - scripts/instrument-cli.ts
  - .github/workflows
documentation:
  - docs/tutorials/ai-agent-workflow.md
modified_files:
  - scripts/instrument-cli.ts
  - server/package.json
  - >-
    backlog/tasks/task-277 -
    Partition-AppState-into-screen-scoped-discriminated-union-—-eliminate-field-cross-contamination.md
priority: high
ordinal: 129000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Dependabot PRs #38-#43 have failing `Test and Lint` because CI/playthrough logs repeatedly throw `connect ECONNREFUSED 127.0.0.1:4318` when no local OTel collector is present. TASK-277 notes saw the same playthrough loop. Telemetry export must be best-effort in CI and local automation: missing collector should not crash verification or gameplay automation.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 OTel SDK/exporter initialization does not produce uncaught exceptions when `OTEL_EXPORTER_OTLP_ENDPOINT` points at an unavailable collector.
- [x] #2 CI/playthrough automation either disables OTLP export unless explicitly configured or uses non-throwing exporter behavior.
- [x] #3 Server/package manifest stays consistent with root package and lockfile for OTel/zod dependency versions.
- [x] #4 Relevant verification commands pass locally: `rtk pnpm verify:quick`, `rtk pnpm -C server test`, and targeted playthrough/CI smoke as feasible.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Align `scripts/instrument-cli.ts` with `server/src/instrument.ts`: detect `OTEL_SDK_DISABLED=true`, CI without explicit `OTEL_EXPORTER_OTLP_ENDPOINT`, and QA/playthrough scripts without explicit endpoint.
2. When disabled, leave console untouched, avoid root span/exporter creation, export no telemetry, and log a single concise disabled message.
3. Keep server manifest consistency change in `server/package.json` as part of this task.
4. Verify with targeted CLI/playthrough smoke under absent collector, then `rtk pnpm -C server test` and `rtk pnpm verify:quick`; broaden to `rtk pnpm qa:playthrough:verify` if runtime permits.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-05-05 @codex: Added CLI instrumentation guard so QA/playthrough scripts disable OTel export unless `OTEL_EXPORTER_OTLP_ENDPOINT` is explicit; also ignores exporter `ECONNREFUSED` for configured OTLP port so explicit but unavailable collector does not crash the CLI. Targeted smoke passed for disabled QA run and explicit unavailable endpoint run.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Hardened CLI/QA OpenTelemetry behavior so playthrough automation no longer assumes a local collector exists. `scripts/instrument-cli.ts` now disables telemetry for QA scripts unless `OTEL_EXPORTER_OTLP_ENDPOINT` is explicitly set, disables in CI without an explicit endpoint, honors `OTEL_SDK_DISABLED=true`, and ignores exporter `ECONNREFUSED` for the configured OTLP port so an unavailable collector does not crash the CLI.

Also aligned `server/package.json` with the root package and lockfile dependency versions from the Dependabot/security upgrade: OTel `0.216.0` packages and `zod` `4.4.3`.

Verification: disabled QA smoke passed; explicit unavailable endpoint smoke passed; `rtk pnpm -C server test` passed alone (46 files, 332 tests); `rtk pnpm verify:quick` passed; `rtk pnpm qa:playthrough:verify` passed (12/12, no warnings/errors); `rtk pnpm check` passed full verification, including build/lint/typecheck/tests/schema/rules/replay/playthrough/docs/formatting. A concurrent server-test plus verify run failed once due build/test race on engine package output, then passed when rerun alone.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Code builds without errors (pnpm build)
- [x] #2 Linting and typechecking pass (pnpm lint and pnpm typecheck)
- [x] #3 All unit and integration tests pass (pnpm test:run:all)
- [x] #4 API schemas and types are re-generated and verified (pnpm schema:gen and scripts/ci/verify-schema.sh)
- [x] #5 Documentation artifacts are updated (pnpm docs:artifacts)
- [x] #6 Automated verification scripts pass (FSM consistency and event log coverage)
<!-- DOD:END -->
