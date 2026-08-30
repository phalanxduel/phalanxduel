---
id: TASK-343.15
title: Enforce the supported gameplay automation capability matrix
status: To Do
assignee: []
created_date: '2026-08-04 22:40'
labels:
  - assurance
  - qa
  - ci
dependencies:
  - TASK-343.10
  - TASK-360.03
documentation:
  - docs/testing.md
  - docs/reference/test-constitution.md
  - docs/reference/qa-runners.md
  - docs/adr/ADR-006-verification-is-policy-based.md
parent_task_id: TASK-343
priority: high
type: task
ordinal: 257800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Turn the declared game experience into an executable, fail-closed capability matrix rather than a collection of ambiguously named scripts. Required dimensions must have current direct evidence, and CI or release profiles must fail when a promised surface is skipped, empty, stale, or only simulated at a lower layer.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A machine-readable capability matrix declares required identity, opponent, deployment, rules mode, action and phase, transport, client, spectator, disruption, persistence, replay, achievement, viewport, accessibility, and environment dimensions
- [ ] #2 The standard profile proves normal and all quick-deploy styles, both damage modes, reinforcement and terminal behavior, guest and authenticated play, PvP and PvB, spectator projection, replay reproduction, and Random-achievement idempotency
- [ ] #3 PR, main, nightly, and controlled production profiles select explicit risk-based subsets while retaining traceable coverage of the complete supported matrix
- [ ] #4 Every required matrix row links to current canonical evidence and fails on NOT_TESTED, zero cases, missing artifacts, stale release identity, warnings promoted as required failures, or pure-engine substitution for a declared remote test
- [ ] #5 Misleading or retired commands and documentation are removed, renamed, or made to reject incompatible modes such as a remote base URL in a pure-engine run
- [ ] #6 The matrix incorporates browser, Go, MCP, and SwiftUI compatibility evidence as those supported adapters become available and reports unsupported combinations explicitly
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code builds without errors (pnpm build)
- [ ] #2 Linting and typechecking pass (pnpm lint and pnpm typecheck)
- [ ] #3 All unit and integration tests pass (pnpm test:run:all)
- [ ] #4 API schemas and types are re-generated and verified (pnpm schema:gen and scripts/ci/verify-schema.sh)
- [ ] #5 Documentation artifacts are updated (pnpm docs:artifacts)
- [ ] #6 Automated verification scripts pass (FSM consistency and event log coverage)
<!-- DOD:END -->
