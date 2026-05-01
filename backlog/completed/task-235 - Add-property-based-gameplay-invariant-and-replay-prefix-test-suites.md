---
id: TASK-235
title: Add property-based gameplay invariant and replay-prefix test suites
status: Done
assignee: []
created_date: '2026-04-13 03:52'
updated_date: '2026-05-01 09:29'
labels:
  - qa
  - engine
  - property-testing
  - replay
  - fairness
milestone: Post-Promotion Hardening
dependencies: []
references:
  - reports/qa/test-council-audit.md
  - engine/tests/simulation.test.ts
  - engine/tests/replay.test.ts
  - bin/qa/replay-verify.ts
  - engine/src/turns.ts
priority: high
ordinal: 8010
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The current deterministic baseline is mostly curated and self-consistency based. Add generated invariant testing so Phalanx Duel explores broader action spaces, validates replay against stepwise execution over many prefixes and seeds, and proves fairness-critical invariants beyond a few golden scenarios.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A generated-action invariant suite explores seeded gameplay prefixes and asserts card conservation phase validity replay continuity and terminal-state integrity
- [x] #2 Replay-prefix tests compare iterative execution against replay reconstruction for many valid action prefixes
- [x] #3 Property tests cover both canonical matchParams-driven initialization and compatibility-path configuration where applicable
- [x] #4 The property suite is deterministic from recorded seeds and integrates with repo verification documentation and CI strategy
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Created engine/tests/property-invariants.test.ts with 22 deterministic property tests across 5 describe blocks: (1) invariants hold at every step for 5 standard seeds + 2 quickStart seeds — checks card conservation (52/player), HP bounds [0..value], phase validity, terminal outcome; (2) replayGame hash matches iterative hash at 5 prefix checkpoints per game; (3) replayGame is idempotent across repeated calls; (4) validateAction rejects all actions in gameOver state; (5) broader seed range (EXTRA_SEEDS) checks invariants + action budget. Fixed a subtle timing invariant: iterative runner must use config.drawTimestamp for system:init to match what replayGame produces internally.
<!-- SECTION:FINAL_SUMMARY:END -->
