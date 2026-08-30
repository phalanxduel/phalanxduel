---
id: TASK-360.02
title: PHX-SWIFT-006 - Prove Browser-versus-SwiftUI Automated 1v1
status: To Do
assignee: []
created_date: '2026-07-25 01:14'
updated_date: '2026-08-04 22:40'
labels:
  - swiftui
  - browser
  - automation
  - playability
dependencies:
  - TASK-360.01
  - TASK-360.03
documentation:
  - docs/testing.md
  - docs/reference/qa-runners.md
parent_task_id: TASK-360
priority: high
type: task
ordinal: 227800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create durable interoperability proof that the browser reference client and the native SwiftUI application can act as opposing players in the same live authoritative match and automatically complete it without manual input.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A single coordinator launches or attaches to a live local server and places one automated browser client and one automated SwiftUI client into the same match as opposing players.
- [ ] #2 Both clients perform legal user-visible gameplay actions through their respective automation surfaces until the authoritative server reports game over.
- [ ] #3 The result manifest correlates both clients to one match ID and records player identities, winner, final score or life-point state, turn count, action count, seed when available, and timestamps.
- [ ] #4 Successful runs retain evidence from both clients covering match start, gameplay, and the shared terminal result; failed runs retain correlated diagnostics from the server and both clients.
- [ ] #5 A documented one-command entrypoint reproduces the cross-client proof on a supported macOS development host.
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

## Comments

<!-- COMMENTS:BEGIN -->
author: @codex
created: 2026-08-04 22:40
---
Automation audit sequencing: reuse the consolidated semantic browser adapter and canonical evidence contract for the browser-versus-SwiftUI proof.
---
<!-- COMMENTS:END -->
