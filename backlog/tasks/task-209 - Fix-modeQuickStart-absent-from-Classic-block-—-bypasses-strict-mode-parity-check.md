---
id: TASK-209
title: >-
  Fix: modeQuickStart absent from Classic block — bypasses strict-mode parity
  check
status: Ready
assignee: []
created_date: '2026-04-06 15:37'
updated_date: '2026-04-30 22:23'
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
ordinal: 2020
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
- [ ] #1 Strict-mode match with modeQuickStart: true is rejected at schema validation
- [ ] #2 Hybrid-mode match with modeQuickStart: true is permitted (override allowed)
- [ ] #3 Existing schema validation tests still pass
- [ ] #4 New test: strict mode rejects modeQuickStart: true
<!-- AC:END -->
