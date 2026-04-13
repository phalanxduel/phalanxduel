---
id: TASK-233
title: 'Make gameplay trust gates part of CI truth, not optional verification'
status: To Do
assignee: []
created_date: '2026-04-13 03:51'
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
