---
id: TASK-360.03
title: Consolidate the browser gameplay automation adapter
status: In Progress
assignee:
  - '@codex'
created_date: '2026-08-04 22:40'
updated_date: '2026-08-30 21:59'
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

2026-08-30 adapter slice: mandatory playability gate passed 12/12 with zero anomalies. Extended bin/qa/game-automator.ts with semantic phase observation, phase/terminal readiness waits, quickDeploy, pass, skipReinforcement, and forfeit methods. Routed simulate-ui pass/skip/forfeit actions through the shared adapter. Focused adapter lint and client typecheck pass; commit 0417aae passed verification hook.

Remaining TASK-360.03 work: migrate deploy/attack selection fully into the adapter, exercise all quick-deploy strategies and mixed manual/quick UI flows, replace remaining fixed sleeps/class-dependent selectors, and run browser/visual/cross-client evidence gates.

Browser validation found and fixed two real transition defects: qaQuickStart now sends classic.modes.quickStart parity required by strict server validation; PvB setup selects the bot before private match creation instead of waiting on a stale lobby. Terminal handling now waits for the semantic game-over-result after the game-over shell appears, preventing outcome reads during presentation latency. Client suite 237/237 and lint:tools pass. Browser evidence: local guest-pvb created and played against bot with match ed74e1f1-c04a-4e52-9a2e-0cad3922fede, trace d0428622d83fd3f5fcb3e2d945035d48; run reached live attack/reinforce turns. A low-LP terminal surfaced a remaining issue: the browser harness can loop on a visible forfeit command without receiving a terminal transition, and clipboard-copy NotAllowedError is noisy in headless mode. Keep task open for command idempotency/terminal assertion and quick-deploy strategy coverage.

Commit 4c2ce47 adds --quick-deploy-strategy defensive|aggressive|random to simulate-ui and routes the selected player-visible control through GameAutomator.quickDeploy. lint:tools and CLI help verification pass. Next browser gate should run one non-quick-start game per strategy plus a mixed manual/quick flow; task remains In Progress until those runs and visual/cross-client reuse are proven.
<!-- SECTION:NOTES:END -->
