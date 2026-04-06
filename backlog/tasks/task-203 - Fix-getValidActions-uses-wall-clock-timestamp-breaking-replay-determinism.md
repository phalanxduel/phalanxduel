---
id: TASK-203
title: 'Fix: getValidActions uses wall-clock timestamp, breaking replay determinism'
status: To Do
assignee: []
created_date: '2026-04-06 15:30'
labels:
  - qa
  - engine
  - p2
  - determinism
  - replay
dependencies: []
references:
  - 'engine/src/turns.ts:627'
  - 'server/src/match.ts:926'
  - docs/RULES.md §18
  - docs/RULES.md §2.1
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Problem

`engine/src/turns.ts:627` uses `new Date().toISOString()` to stamp candidate `Action` objects returned by `getValidActions`. Any caller that uses these action objects verbatim for submission will produce actions with non-deterministic timestamps. If those actions are logged and replayed, the card IDs generated during replay will differ from the originals (card IDs embed the timestamp), violating RULE-044.

## Evidence

- `turns.ts:627`: `const timestamp = new Date().toISOString()`
- RULES.md §18: "Identical inputs must produce identical postState, stateHashAfter, and phase-hop trace sequence"
- RULES.md §2.1: Card ID format includes timestamp component

## Fix

`getValidActions` should accept an optional `timestamp` parameter (defaulting to a caller-injectable value or the current state's last known timestamp). Alternatively, document clearly that callers must replace timestamps before submitting actions. The server already does this correctly (`match.ts:926`: `const serverAction = { ...action, timestamp: new Date().toISOString() }`), but the engine itself should not create the footgun.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 getValidActions called twice in the same millisecond produces actions with identical timestamps (or accepts injected timestamp)
- [ ] #2 The fix does not break any caller that currently discards the timestamp (server replaces it anyway)
- [ ] #3 Existing tests still pass
<!-- AC:END -->
