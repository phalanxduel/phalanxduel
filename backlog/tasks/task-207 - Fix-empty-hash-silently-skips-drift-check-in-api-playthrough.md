---
id: TASK-207
title: 'Fix: empty hash silently skips drift check in api-playthrough'
status: Done
assignee: []
created_date: '2026-04-06 15:35'
updated_date: '2026-04-30 23:49'
labels:
  - qa
  - tooling
  - p2
  - drift-detection
milestone: Post-Promotion Hardening
dependencies: []
references:
  - 'bin/qa/api-playthrough.ts:590'
priority: medium
ordinal: 8070
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
- [x] #1 Empty or missing stateHashAfter from server causes a drift detection failure, not a silent skip
- [x] #2 Empty or missing local hash causes a drift detection failure
- [x] #3 Normal playthrough with correct hashes still passes
- [x] #4 CI run output clearly indicates missing-hash failure vs hash-mismatch failure
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Replace `if (localHash && serverHash && localHash !== serverHash)` at bin/qa/api-playthrough.ts:650 with two sequential guards:
1. `if (!localHash || !serverHash)` → throw `STATE_DRIFT: missing hash — local: X, server: Y` with recordPattern
2. `if (localHash !== serverHash)` → existing mismatch block (unchanged)
This makes missing hashes a hard failure with a distinct message (AC1, AC2, AC4) while leaving normal-path behaviour untouched (AC3). No test infra needed — AC3 is covered by the existing qa:playthrough:verify runs.
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Replaced the silent-skip condition `if (localHash && serverHash && localHash !== serverHash)` with two sequential guards: a missing-hash assertion that throws `STATE_DRIFT: missing hash — local: X, server: Y` (distinct from mismatch), followed by the unchanged mismatch block. AC3 is covered by the passing qa:playthrough:verify runs (12/12). TypeCheck clean.
<!-- SECTION:FINAL_SUMMARY:END -->
