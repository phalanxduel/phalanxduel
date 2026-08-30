---
id: TASK-360.03
title: Consolidate the browser gameplay automation adapter
status: In Progress
assignee:
  - '@codex'
created_date: '2026-08-04 22:40'
updated_date: '2026-08-30 21:44'
labels:
  - browser
  - automation
  - playability
dependencies:
  - TASK-343.14
documentation:
  - docs/testing.md
  - docs/reference/qa-runners.md
  - docs/adr/ADR-017-authoritative-view-model-projection.md
parent_task_id: TASK-360
priority: high
type: task
ordinal: 256800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Replace duplicated selector, phase, action, wait, and terminal-state logic with one semantic browser-player adapter used by browser playthrough, visual, and cross-client proofs. The adapter must act through player-visible controls while interpreting authoritative projected state.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 One browser-player adapter can observe player-visible phase and turn state and execute deploy, quickDeploy, attack, pass, reinforce, and forfeit through stable semantic controls
- [ ] #2 Defensive, Aggressive, and Random quick-deploy choices and mixed manual deployment are exercised through the real browser UI
- [ ] #3 Browser playthrough, rich UI simulation, visual regression, and cross-client coordination reuse the adapter instead of maintaining independent gameplay selectors and action loops
- [ ] #4 Terminal detection tolerates authoritative-to-presentational transition latency without retrying gameplay after the match has terminated
- [ ] #5 Fixed sleeps and styling-class dependencies are replaced by semantic readiness conditions wherever an authoritative or accessibility signal exists
- [ ] #6 Success and failure runs emit the canonical versioned evidence contract with correlated screenshots, console diagnostics, match identity, actions, and final outcome
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

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inventory simulate-ui, visual regression, and cross-client browser action loops.
2. Extract a semantic browser-player adapter for authoritative phase, valid actions, controls, and terminal readiness.
3. Migrate the smallest browser runner surface and preserve canonical evidence output.
4. Exercise deployment strategies and mixed manual/quick deployment through the real UI.
5. Run playability, browser, visual, and full repository verification gates.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-08-30 started after TASK-343.14 completion. Mandatory pnpm qa:playthrough:verify passed 12/12 scenarios with zero anomalies; browser adapter work is unblocked.
<!-- SECTION:NOTES:END -->
