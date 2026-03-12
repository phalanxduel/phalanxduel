---
id: TASK-36
title: PHX-QA-002 - Make simulate-ui target local QA safely by default
status: To Do
assignee: []
created_date: '2026-03-12 14:40'
labels: []
dependencies: []
---

## Description

Promote the `simulate-ui.ts` production-default hazard into tracked backlog
work. QA automation should be local-safe by default, with explicit operator
intent required before a run targets production.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The primary simulate-ui workflow no longer defaults silent QA runs to production.
- [ ] #2 Operators get an explicit warning or override when a simulate-ui run targets production.
<!-- AC:END -->

## References

- `docs/system/RISKS.md`
- `bin/qa/simulate-ui.ts`
