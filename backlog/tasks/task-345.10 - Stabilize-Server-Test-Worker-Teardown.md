---
id: TASK-345.10
title: Stabilize Server Test Worker Teardown
status: Done
assignee:
  - '@codex'
created_date: '2026-07-14 00:28'
updated_date: '2026-07-14 00:37'
labels: []
dependencies: []
references:
  - TASK-345.04
documentation:
  - docs/testing.md
modified_files:
  - server/vitest.config.ts
  - server/tests/vitest-environment.test.ts
parent_task_id: TASK-345
priority: high
ordinal: 209800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The full server suite completes 56 files and 382 assertions but exits 1 with `EnvironmentTeardownError: [vitest-worker]: Closing rpc while "onUserConsoleLog" was pending`, attributed to `tests/reconnect.test.ts`. The isolated reconnect suite passes 14/14. Diagnose and correct the teardown race without changing production runtime behavior unless evidence proves an actual lifecycle defect. This blocks final verification of TASK-345.04.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A deterministic or statistically reliable reproduction isolates the teardown failure conditions.
- [x] #2 The root cause and eliminated hypotheses are documented in the task notes.
- [x] #3 `pnpm test:run:server` exits 0 on repeated verification runs.
- [x] #4 The isolated reconnect suite remains green.
- [x] #5 Temporary diagnostic instrumentation is removed and the repository-wide `pnpm check` gate passes.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Reproduce the full-suite teardown failure with a controlled server-test command and capture its statistical/order/concurrency conditions.
2. Minimize the interaction by inspecting reconnect lifecycle cleanup, console/logging paths, Vitest worker configuration, and cross-file concurrency.
3. Rank falsifiable hypotheses, then instrument only the most discriminating seams and remove instrumentation after diagnosis.
4. Add the narrowest regression at the responsible seam and fix the underlying cleanup/configuration race without altering production behavior unless evidence requires it.
5. Verify the isolated reconnect suite, repeat the full server suite, then run `pnpm check`; document the root cause and close the blocker before resuming TASK-345.04.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Context Hunter classification: L1 test-configuration defect. Inspected server/vitest.config.ts, server/tests/reconnect.test.ts, socket helpers, match timer/analysis lifecycle, instrument.ts console patching, OTel tests, test wrapper, historical suite output, and relevant commits.

Root cause: ordinary local Vitest workers imported server/src/instrument.ts through match.ts, booting the runtime OTel SDK and wrapping console.* on top of Vitest's console RPC interceptor. Under full-suite log volume, Vitest began worker teardown while an onUserConsoleLog RPC was pending. Reconnect was the attribution site, not a failing gameplay test.

Discriminating controls: the baseline normal suite reproduced twice with 56/56 files and 382/382 assertions followed by EnvironmentTeardownError; isolated reconnect passed 14/14. A full run with OTEL_SDK_DISABLED=true passed, and a second full run with only OTEL_CONSOLE_LOGS_ENABLED=false also passed, proving the console double-interception seam. Secondary-manager timers, post-game analysis errors, generic OTel exporter shutdown, and a reconnect correctness defect were eliminated as primary causes.

Regression-first fix: server/tests/vitest-environment.test.ts failed before configuration because OTEL_SDK_DISABLED was undefined. server/vitest.config.ts now makes local tests match CI telemetry isolation and explicitly disables console forwarding. The invariant plus reconnect passed 15/15. Two subsequent normal pnpm test:run:server runs passed 57/57 files, 383/383 assertions, migration runner 4/4, exit 0.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Stabilized the local server test runner by isolating Vitest workers from runtime OTel exporters and console forwarding. Added an executable environment invariant, proved it red before the fix, and kept all production telemetry and reconnect/gameplay code unchanged. Diagnosis showed the teardown was caused by OTel's console wrapper layered over Vitest's console RPC interceptor under full-suite log volume; reconnect was only the attribution site. Verification: isolated invariant + reconnect 15/15; two normal server suites 57 files/383 tests plus migration 4/4; repository-wide `pnpm check`; schema generation/check; FSM, event-log, rule-evidence, and 2,355,388-case combat-reference verification.
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
