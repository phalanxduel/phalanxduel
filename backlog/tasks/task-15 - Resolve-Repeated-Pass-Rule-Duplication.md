---
id: TASK-15
title: Resolve Repeated-Pass Rule Duplication
status: Done
assignee: []
created_date: ''
updated_date: '2026-03-15 15:35'
labels: []
dependencies: []
priority: medium
ordinal: 14000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
This record exists to resolve overlap with `TASK-1`. The repeated-pass
auto-loss behavior is already implemented under the broader pass-limit feature,
so this task now documents the duplication cleanup instead of scheduling a
second implementation of the same rule.

## Historical Outcome

Given the historical backlog contained both a broad pass-limit task and a
second repeated-pass auto-loss task, when the backlog was audited, then this
record was reduced to a historical duplicate note and the canonical
implementation remained `TASK-1`.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Given the current rules and engine behavior, when repeated passes exceed
  the configured threshold, then the behavior is already satisfied by `TASK-1`.
- [x] #2 Given ranked-roadmap planning, when operators review anti-stalling work,
  then there is one canonical implementation task instead of two competing ones.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- `docs/RULES.md` section 16 defines the pass limits.
- `engine/src/turns.ts` and `engine/tests/pass-rules.test.ts` are the canonical
  implementation and verification references.

## Verification

- `rg -n "maxConsecutivePasses|maxTotalPassesPerPlayer|passLimit" docs/RULES.md engine/src/turns.ts engine/tests/pass-rules.test.ts`
<!-- SECTION:NOTES:END -->
