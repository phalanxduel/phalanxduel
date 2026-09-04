---
id: TASK-386.03
title: Audit wiki diagrams and docs against current architecture
status: To Do
assignee: []
created_date: '2026-09-04 14:25'
labels:
  - docs
  - wiki
dependencies: []
documentation:
  - phalanxduel/wiki repository
parent_task_id: TASK-386
priority: medium
type: docs
ordinal: 263800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The `phalanxduel/wiki` repo already has real coverage: Architecture-and-Protocol-Overview.md, Match-Lifecycle-Diagram.md, API-Surface-Diagram.md, Container-Architecture-Diagram.md, Observability-and-Debugging.md, Diagram-Index.md. None of it has been checked against the current codebase in this workstream.

Given the pattern found elsewhere this session (the printed quickstart's setup diagram had a real facing bug, phalanxduel.com's rules page had two real rules bugs), treat staleness as the likely default rather than the exception. Check each diagram/doc's claims against the actual current code (engine phase machine, match lifecycle, API surface, container topology) and correct what's wrong; note what's still accurate as-is rather than rewriting it.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Each of the six wiki docs listed has been checked against current code, not assumed current
- [ ] #2 Every factual discrepancy found is corrected, with the specific claim and correction noted in the task's implementation notes
- [ ] #3 Docs confirmed accurate are left alone
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code builds without errors (pnpm build)
- [ ] #2 Linting and typechecking pass (pnpm lint and pnpm typecheck)
- [ ] #3 All unit and integration tests pass (pnpm test:run:all)
- [ ] #4 API schemas and types are re-generated and verified (pnpm schema:gen and scripts/ci/verify-schema.sh)
- [ ] #5 Documentation artifacts are updated (pnpm docs:artifacts)
- [ ] #6 Automated verification scripts pass (FSM consistency and event log coverage)
<!-- DOD:END -->
