---
id: TASK-204
title: 'Fix: simulation tests use live timestamps making failures non-reproducible'
status: Done
assignee: []
created_date: '2026-04-06 15:31'
updated_date: '2026-05-01 00:12'
labels:
  - qa
  - engine
  - p2
  - determinism
  - tests
milestone: Post-Promotion Hardening
dependencies: []
references:
  - 'engine/tests/simulation.test.ts:201'
  - 'engine/tests/simulation.test.ts:227'
  - 'engine/tests/simulation.test.ts:243'
  - 'engine/tests/simulation.test.ts:264'
  - 'engine/tests/simulation.test.ts:286'
priority: medium
ordinal: 8080
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

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Already resolved prior to this session. All action timestamps in engine/tests/simulation.test.ts use the fixed constant '2026-01-01T00:00:00.000Z' — no live new Date() calls present. No code change required.
<!-- SECTION:FINAL_SUMMARY:END -->
