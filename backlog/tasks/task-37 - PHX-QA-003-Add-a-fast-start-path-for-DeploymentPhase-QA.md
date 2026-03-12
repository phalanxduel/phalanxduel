---
id: TASK-37
title: PHX-QA-003 - Add a fast-start path for DeploymentPhase QA
status: To Do
assignee: []
created_date: '2026-03-12 14:40'
labels: []
dependencies: []
---

## Description

Track the slow DeploymentPhase QA setup as explicit backlog work. Test and QA
flows need a fast, intentional way to reach post-deployment phases without
changing the production gameplay rules.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 QA and automation can reach post-deployment phases without manually filling all 16 battlefield slots in normal gameplay flows.
- [ ] #2 Any accelerated setup path is explicit and isolated to test or QA use so production rules remain unchanged.
<!-- AC:END -->

## References

- `docs/system/RISKS.md`
- `engine/src/turns.ts`
- `bin/qa/simulate-ui.ts`
