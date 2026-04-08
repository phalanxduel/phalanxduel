---
id: TASK-207
title: 'Fix: empty hash silently skips drift check in api-playthrough'
status: To Do
assignee: []
created_date: '2026-04-06 15:35'
updated_date: '2026-04-08 21:46'
labels:
  - qa
  - tooling
  - p2
  - drift-detection
dependencies: []
references:
  - 'bin/qa/api-playthrough.ts:590'
priority: medium
ordinal: 830
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Problem

`bin/qa/api-playthrough.ts:590` uses `if (localHash && serverHash && localHash !== serverHash)` to detect drift. If either hash is an empty string or undefined, the comparison is silently skipped and the run continues as if no drift occurred.

A server that returns empty `stateHashAfter` values (due to a bug or attack) would pass all drift checks silently, completely defeating the purpose of the per-action hash verification.

## Fix

Replace the silent skip with an explicit assertion: if either hash is empty/missing when it is expected to be present, treat it as a drift error and fail the run with an appropriate message (`STATE_DRIFT: missing hash — local: <x>, server: <y>`).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Empty or missing stateHashAfter from server causes a drift detection failure, not a silent skip
- [ ] #2 Empty or missing local hash causes a drift detection failure
- [ ] #3 Normal playthrough with correct hashes still passes
- [ ] #4 CI run output clearly indicates missing-hash failure vs hash-mismatch failure
<!-- AC:END -->
