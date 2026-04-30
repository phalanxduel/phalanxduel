---
id: TASK-233
title: 'Make gameplay trust gates part of CI truth, not optional verification'
status: Human Review
assignee:
  - '@codex'
created_date: '2026-04-13 03:51'
updated_date: '2026-04-30 20:53'
labels:
  - qa
  - ci
  - fairness
  - replay
dependencies:
  - TASK-198
  - TASK-206
references:
  - reports/qa/test-council-audit.md
  - .github/workflows/pipeline.yml
  - package.json
  - bin/check
  - scripts/ci/verify-playthrough-anomalies.ts
priority: high
ordinal: 110
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The default green path currently excludes the strongest fairness checks. Promote the gameplay trust gates identified by the test council into protected CI so a green pipeline means replay fidelity, adversarial rejection, coverage, and QA anomaly verification all passed rather than only lint, typecheck, and unit tests.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Protected CI includes adversarial server-authority coverage replay verification and coverage reporting in addition to the existing verify:ci path
- [x] #2 At least one protected lane runs playthrough anomaly verification with warnings failing by default rather than only on explicit flags
- [x] #3 CI artifacts make it clear which gameplay trust gates ran and which failed
- [x] #4 Repository docs describe the difference between smoke checks and fairness truth gates and point contributors to the required commands
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
2026-04-30 approved plan: Treat this as L2 CI/trust-gate work. Update `scripts/ci/verify.sh` so remote `verify:ci` always runs the lightweight gameplay trust gates (`qa:replay:verify` and `qa:playthrough:verify`) instead of skipping them unless `ACT=true`, while preserving `test:coverage:run` as the CI test phase. Keep the existing dedicated adversarial CI job with Postgres as the authority rejection lane. Improve CI artifact/evidence clarity in `.github/workflows/pipeline.yml` by making trust-gate artifacts and/or summary output explicitly name coverage, replay verification, playthrough anomaly verification, and adversarial authority checks. Update contributor/delivery docs to distinguish fast smoke checks from fairness truth gates and point contributors to the required commands. Verify with focused script/doc checks plus the strongest feasible local verification (`rtk pnpm verify:ci` or documented fallback if runtime is too heavy), then update AC/notes and move to Human Review after evidence is recorded.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-04-30: Implemented in commit bfafc314 (`ci: promote gameplay trust gates`). `verify:ci` now always runs `pnpm qa:replay:verify` and `pnpm qa:playthrough:verify` on remote CI instead of skipping those gates outside `ACT=true`. The existing adversarial Postgres job remains a separate protected server-authority lane and deployment build waits on both `test` and `adversarial`.

CI evidence is clearer now: the test job writes a Gameplay Trust Gates step summary naming coverage, replay, playthrough anomaly verification, and adversarial authority; the adversarial job writes its own server-authority summary; the playthrough failure artifact was renamed to `gameplay-trust-gate-artifacts`.

Docs updated in `.github/CONTRIBUTING.md`, `docs/system/delivery-pipeline.md`, and `docs/reference/pnpm-scripts.md` to distinguish smoke checks from fairness truth gates and point contributors to `pnpm verify:ci`, `pnpm verify:full`, `pnpm qa:playthrough:verify`, and `pnpm --filter @phalanxduel/server test:adversarial`.

Verification: `rtk bash -n scripts/ci/verify.sh scripts/ci/playthrough-verify.sh` passed; `rtk pnpm lint` passed, including shellcheck/actionlint; `rtk pnpm lint:md` passed. First sandboxed `rtk pnpm verify:ci` failed due sandbox network restrictions (`listen EPERM`, `connect EPERM 127.0.0.1:5432`). Escalated rerun of `rtk pnpm verify:ci` passed: coverage suites shared 107/107, engine 210/210, server 317/317 with coverage report; replay verify 20/20; playthrough verify 12/12 with 0 warnings and 0 errors; docs check, markdownlint, and Prettier passed. An intermediate escalated run hit a transient server coverage timeout in `match-log-routes`; isolated `tests/match-log-routes.test.ts --coverage` passed 17/17 and the final full `verify:ci` rerun passed.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Promoted gameplay trust gates into protected CI. `verify:ci` now runs replay verification and playthrough anomaly verification with warnings failing, while retaining coverage-producing test suites. The protected pipeline keeps adversarial server-authority checks in a dedicated Postgres-backed job and deployment still waits on both `test` and `adversarial`. Workflow summaries and renamed trust-gate artifacts make coverage, replay, playthrough anomaly, and adversarial authority evidence visible. Contributor and delivery docs now distinguish fast smoke checks from fairness truth gates and list the commands required for review-ready gameplay work.
<!-- SECTION:FINAL_SUMMARY:END -->
