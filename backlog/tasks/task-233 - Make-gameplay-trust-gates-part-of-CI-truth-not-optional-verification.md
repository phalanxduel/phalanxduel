---
id: TASK-233
title: 'Make gameplay trust gates part of CI truth, not optional verification'
status: In Progress
assignee:
  - '@codex'
created_date: '2026-04-13 03:51'
updated_date: '2026-04-30 20:35'
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
- [ ] #1 Protected CI includes adversarial server-authority coverage replay verification and coverage reporting in addition to the existing verify:ci path
- [ ] #2 At least one protected lane runs playthrough anomaly verification with warnings failing by default rather than only on explicit flags
- [ ] #3 CI artifacts make it clear which gameplay trust gates ran and which failed
- [ ] #4 Repository docs describe the difference between smoke checks and fairness truth gates and point contributors to the required commands
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
2026-04-30 approved plan: Treat this as L2 CI/trust-gate work. Update `scripts/ci/verify.sh` so remote `verify:ci` always runs the lightweight gameplay trust gates (`qa:replay:verify` and `qa:playthrough:verify`) instead of skipping them unless `ACT=true`, while preserving `test:coverage:run` as the CI test phase. Keep the existing dedicated adversarial CI job with Postgres as the authority rejection lane. Improve CI artifact/evidence clarity in `.github/workflows/pipeline.yml` by making trust-gate artifacts and/or summary output explicitly name coverage, replay verification, playthrough anomaly verification, and adversarial authority checks. Update contributor/delivery docs to distinguish fast smoke checks from fairness truth gates and point contributors to the required commands. Verify with focused script/doc checks plus the strongest feasible local verification (`rtk pnpm verify:ci` or documented fallback if runtime is too heavy), then update AC/notes and move to Human Review after evidence is recorded.
<!-- SECTION:PLAN:END -->
