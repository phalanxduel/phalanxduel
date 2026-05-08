---
id: TASK-HIGH.02
title: 'Deepen Transport Seam: Decouple WebSockets from MatchInstance'
status: Done
assignee:
  - '@antigravity'
created_date: '2026-05-05 20:07'
updated_date: '2026-05-05 23:15'
labels: []
milestone: m-8
dependencies:
  - TASK-MEDIUM.02
parent_task_id: TASK-HIGH
ordinal: 130000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Extract network details (WebSocket) from MatchInstance into a dedicated MatchConnectionTracker. The MatchActor and MatchInstance should only deal with abstract playerId/sessionId strings, isolating network edge cases.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Phase 1 (Done): Create MatchConnectionTracker abstraction with full test coverage. Phase 2: Wire tracker into LocalMatchManager as delegate. Phase 3: Migrate socketMap and send() to use tracker. Phase 4: Remove WebSocket from PlayerConnection/SpectatorConnection.
<!-- SECTION:PLAN:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code builds without errors (pnpm build)
- [ ] #2 Linting and typechecking pass (pnpm lint and pnpm typecheck)
- [ ] #3 All unit and integration tests pass (pnpm test:run:all)
- [ ] #4 API schemas and types are re-generated and verified (pnpm schema:gen and scripts/ci/verify-schema.sh)
- [ ] #5 Documentation artifacts are updated (pnpm docs:artifacts)
- [ ] #6 Automated verification scripts pass (FSM consistency and event log coverage)
<!-- DOD:END -->
