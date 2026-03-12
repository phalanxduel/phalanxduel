---
id: TASK-38
title: PHX-QA-004 - Add a durable automation hook for short-lived battle animations
status: To Do
assignee: []
created_date: '2026-03-12 14:40'
labels: []
dependencies: []
---

## Description

Track the short-lived animation verification problem as explicit QA tooling
work. Automation needs a durable signal that recent Pizzazz animations fired,
without depending on screenshot timing windows that are narrower than tool
round-trip latency.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Automated QA can verify recent Pizzazz animation triggers without depending on sub-200ms screenshot timing.
- [ ] #2 The verification hook is durable enough for test tooling but does not change player-facing animation behavior.
<!-- AC:END -->

## References

- `docs/system/RISKS.md`
- `client/src/pizzazz.ts`
