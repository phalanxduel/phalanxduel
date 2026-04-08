---
id: TASK-204
title: 'Fix: simulation tests use live timestamps making failures non-reproducible'
status: To Do
assignee: []
created_date: '2026-04-06 15:31'
updated_date: '2026-04-08 21:46'
labels:
  - qa
  - engine
  - p2
  - determinism
  - tests
dependencies: []
references:
  - 'engine/tests/simulation.test.ts:201'
  - 'engine/tests/simulation.test.ts:227'
  - 'engine/tests/simulation.test.ts:243'
  - 'engine/tests/simulation.test.ts:264'
  - 'engine/tests/simulation.test.ts:286'
priority: medium
ordinal: 820
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Problem

`engine/tests/simulation.test.ts` creates action objects with `new Date().toISOString()` at lines 201, 227, 243, 264, 286. Because card IDs embed the draw timestamp, a failing simulation run cannot be faithfully replayed from the captured action log — re-running the simulation generates different card IDs.

This means simulation-detected correctness failures have no reproducible replay path, increasing debugging cost significantly.

## Fix

Replace live `new Date().toISOString()` calls in simulation tests with a fixed constant timestamp (e.g., `'2024-01-01T00:00:00.000Z'`). This makes the action log deterministic and replayable.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Simulation tests use fixed timestamps for all action creation
- [ ] #2 Running the simulation test twice produces identical action logs
- [ ] #3 All simulation tests still pass
<!-- AC:END -->
