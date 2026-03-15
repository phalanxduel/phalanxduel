---
id: TASK-44.11
title: QA and Operations Tooling Documentation
status: To Do
assignee: []
created_date: '2026-03-14 04:00'
updated_date: '2026-03-15 18:18'
labels:
  - docs
  - qa
  - tooling
dependencies: []
references:
  - bin/qa/simulate-headless.ts
  - bin/qa/simulate-ui.ts
  - scripts/ci/verify-playthrough-anomalies.ts
  - scripts/release/deploy-fly.sh
  - docs/system/PNPM_SCRIPTS.md
parent_task_id: TASK-44
priority: medium
ordinal: 23000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Several operational and QA scripts exist and are actively used but lack sufficient documentation for operators and contributors to understand what they do, how to interpret results, or when to use them. `pnpm qa:anomalies` has no documentation on what anomalies it checks or how to interpret results. The playthrough simulation parameters are not fully explained. The release process (`pnpm sentry:release`, `pnpm deploy:prod`) is not clearly documented beyond the scripts themselves.

**Concern sources:**
- **Gordon**: Classified `pnpm qa:anomalies` as **HIGH RISK** due to no documentation on what anomalies it checks or how to interpret results. Flagged `pnpm deploy:prod` as **HIGH RISK** — "Deployment script exists but runbook is missing." Noted `pnpm diagnostics` and `pnpm sentry:release` are documented only in `package.json`.
- **Gemini CLI**: Noted "QA tooling underdocumented" — scripts are real but discovery docs are limited.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 `docs/system/PNPM_SCRIPTS.md` is updated with clear descriptions for: `pnpm qa:anomalies` (what it checks, how to read output), `pnpm qa:playthrough:matrix` (parameters and interpretation), `pnpm diagnostics` (what it reports).
- [ ] #2 The release process (`pnpm deploy:prod`, `pnpm sentry:release`, `pnpm version:sync`) has a documented step-by-step workflow.
- [ ] #3 Each documented script includes: purpose, usage, expected output, and how to interpret results.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Read `scripts/ci/verify-playthrough-anomalies.ts` to understand what anomalies it detects and how to interpret output.
2. Read `bin/qa/simulate-headless.ts` and `bin/qa/simulate-ui.ts` to document parameters and environment variables.
3. Read `scripts/release/deploy-fly.sh`, `track-sentry.sh`, and `bin/maint/sync-version.sh` to document the release workflow.
4. Read `bin/maint/report-diagnostics.sh` to document diagnostic output.
5. Update `docs/system/PNPM_SCRIPTS.md` with expanded descriptions.
6. Optionally add a "Release Process" section to `PNPM_SCRIPTS.md` or the runbook (TASK-44.4).
<!-- SECTION:PLAN:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 **Observability (DoD §5)**: QA and operations tooling is documented well enough that operators can use it without reading source code.
- [ ] #2 **Verification (DoD §2)**: Documented commands are verified runnable; `pnpm lint:md` passes.
- [ ] #3 **Accessibility (DoD §6)**: A contributor can find and understand how to run QA simulations, interpret anomaly checks, and execute a release from documentation alone.
<!-- DOD:END -->
