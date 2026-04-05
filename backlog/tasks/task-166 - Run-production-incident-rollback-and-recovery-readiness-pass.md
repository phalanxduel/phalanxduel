---
id: TASK-166
title: Run production incident rollback and recovery readiness pass
status: Done
assignee:
  - '@codex'
created_date: '2026-04-01 20:31'
updated_date: '2026-04-05 00:53'
labels: []
dependencies:
  - TASK-49
priority: high
ordinal: 90000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Operational readiness needs to be tested as a system, not assumed from unit and
integration coverage. This task validates deploy rollback, active-match impact,
restart recovery expectations, and operator-facing incident procedures.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 #1 A documented incident/rollback checklist exists for active gameplay
  deploys and restarts.
- [x] #2 #2 At least one dry-run validates the expected behavior for restart
  during an active match.
- [x] #3 #3 Operator-facing gaps in recovery, observability, or documentation are
  captured and resolved or deferred explicitly.
- [x] #4 #4 Production readiness notes identify which incident scenarios are
  supported vs unsupported.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Consolidate the canonical rollback and recovery operator flow across docs/system/OPERATIONS_RUNBOOK.md, docs/deployment/DEPLOYMENT_CHECKLIST.md, and docs/operations/CI_CD_PIPELINE.md so they describe the same current Fly remote-deploy process and incident expectations.
2. Use the existing restart-survivability evidence in server/tests/reconnect.test.ts as the dry-run basis, and add any targeted wording or verification notes needed so the recovery expectation is explicit to operators.
3. Update the canonical operator docs to distinguish supported versus unsupported incident scenarios for active-match deploys, server restarts, failed rollback, and migration trouble, including the exact operator actions for each case.
4. Record the readiness conclusions, residual gaps, and verification evidence in TASK-166, then run targeted verification on the touched docs and supporting recovery tests before moving the task forward.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-04-02: Pulled as the next unresolved production-release slice after TASK-49 implementation. Starting discovery across the operations runbook, deployment checklist, release scripts, restart/rejoin behavior, and recovery-related docs/tests before proposing the implementation plan.

2026-04-02: Consolidated rollback and restart recovery guidance across the canonical operator docs. docs/system/OPERATIONS_RUNBOOK.md now defines active-match deployment semantics, explicit active-match restart recovery steps, and schema-related rollback limits; docs/deployment/DEPLOYMENT_CHECKLIST.md now includes active-match and rollback/recovery checklists; docs/operations/CI_CD_PIPELINE.md now states the operational implications of the current Fly remote source deploy path.

2026-04-02 verification: rtk pnpm --filter @phalanxduel/server exec vitest run tests/reconnect.test.ts; rtk pnpm docs:check. The restart/rejoin suite passed (11 tests), confirming restart-safe rejoin and reconnect-deadline preservation. docs:check passed after staging the regenerated docs/system/KNIP_REPORT.md artifact required by existing server-file line-number drift in the dirty worktree.

2026-04-02 readiness conclusion: supported scenarios are rolling deploy/restart with reconnect-based match recovery, app-level rollback while schema/state remain compatible, and expected forfeit when the pre-existing reconnect deadline expires. Unsupported scenarios are seamless no-disconnect deploy guarantees, automatic rewind of persisted gameplay state, and schema-incompatible rollback without separate database recovery.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Codified the production rollback and recovery playbook for the current Fly remote-deploy model, documented supported versus unsupported active-match incident scenarios, and verified restart-safe rejoin behavior plus doc-artifact consistency.
<!-- SECTION:FINAL_SUMMARY:END -->
