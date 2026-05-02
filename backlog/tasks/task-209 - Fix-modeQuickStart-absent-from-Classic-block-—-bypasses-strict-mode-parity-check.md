---
id: TASK-209
title: >-
  Fix: modeQuickStart absent from Classic block — bypasses strict-mode parity
  check
status: Done
assignee: []
created_date: '2026-04-06 15:37'
updated_date: '2026-05-02 12:50'
labels:
  - qa
  - engine
  - rules
  - p2
  - correctness
milestone: m-6
dependencies: []
references:
  - 'shared/src/schema.ts:536-575'
  - docs/gameplay/rules.md §3.4
priority: medium
ordinal: 8300
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Problem

`shared/src/schema.ts:536-575` defines the strict-mode parity check that compares top-level match params against the `classic.*` defaults. However, `modeQuickStart` is not included in the classic block, so a strict-mode match can have `modeQuickStart: true` without triggering a strict-mode violation.

RULES.md §3.4 marks `modeQuickStart` as a reserved compatibility flag that must remain `false` for v1.0-compliant matches. The strict-mode guard should enforce this.

## Fix

Add `modeQuickStart: false` to the classic block in `DEFAULT_MATCH_PARAMS` and include it in the strict-mode parity check so that `modeQuickStart: true` in strict mode is correctly rejected.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Strict-mode match with modeQuickStart: true is rejected at schema validation
- [x] #2 Hybrid-mode match with modeQuickStart: true is permitted (override allowed)
- [x] #3 Existing schema validation tests still pass
- [x] #4 New test: strict mode rejects modeQuickStart: true
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add `quickStart: z.boolean().optional()` to ClassicConfigPartialSchema.modes (shared/src/schema.ts ~line 354)
2. Add `quickStart: false` to DEFAULT_MATCH_PARAMS.classic.modes (line 591)
3. Compute `classicQuickStart` and include it in the `modes` block in normalizeCreateMatchParams (line 716)
4. Add `['modeQuickStart', data.modeQuickStart, data.classic.modes.quickStart]` to the strict-mode parity check (line 565)
5. Run shared tests and verify strict-mode rejection of modeQuickStart:true
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added `quickStart: z.boolean().default(false)` to MatchConfigClassicSchema.modes (canonical schema) and `quickStart: z.boolean().optional()` to ClassicConfigPartialSchema.modes (input schema). Added `quickStart: false` to DEFAULT_MATCH_PARAMS.classic.modes. Wired quickStart into the normalizer's modes block. Added strict-mode parity check entry `['modeQuickStart', data.modeQuickStart, data.classic.modes.quickStart]`. All 109 shared tests pass including two new cases: strict mode rejects modeQuickStart:true (AC1/AC4) and hybrid mode permits it (AC2).
<!-- SECTION:FINAL_SUMMARY:END -->
