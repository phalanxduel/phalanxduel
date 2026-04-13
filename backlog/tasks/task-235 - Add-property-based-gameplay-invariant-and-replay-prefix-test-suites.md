---
id: TASK-235
title: Add property-based gameplay invariant and replay-prefix test suites
status: To Do
assignee: []
created_date: '2026-04-13 03:52'
labels:
  - qa
  - engine
  - property-testing
  - replay
  - fairness
dependencies: []
references:
  - reports/qa/test-council-audit.md
  - engine/tests/simulation.test.ts
  - engine/tests/replay.test.ts
  - bin/qa/replay-verify.ts
  - engine/src/turns.ts
priority: high
ordinal: 130
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The current deterministic baseline is mostly curated and self-consistency based. Add generated invariant testing so Phalanx Duel explores broader action spaces, validates replay against stepwise execution over many prefixes and seeds, and proves fairness-critical invariants beyond a few golden scenarios.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A generated-action invariant suite explores seeded gameplay prefixes and asserts card conservation phase validity replay continuity and terminal-state integrity
- [ ] #2 Replay-prefix tests compare iterative execution against replay reconstruction for many valid action prefixes
- [ ] #3 Property tests cover both canonical matchParams-driven initialization and compatibility-path configuration where applicable
- [ ] #4 The property suite is deterministic from recorded seeds and integrates with repo verification documentation and CI strategy
<!-- AC:END -->
