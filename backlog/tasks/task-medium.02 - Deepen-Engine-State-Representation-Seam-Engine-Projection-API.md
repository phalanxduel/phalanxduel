---
id: TASK-MEDIUM.02
title: 'Deepen Engine State Representation Seam: Engine Projection API'
status: To Do
assignee: []
created_date: '2026-05-05 20:07'
labels: []
milestone: m-8
dependencies: []
parent_task_id: TASK-MEDIUM
ordinal: 133000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The engine should expose a narrow, deep interface (e.g., a GameProjection adapter) that answers high-level questions like getWinner(), isPlayerTurn(id), rather than forcing the server to traverse nested arrays like match.state.players[1].playerId.
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code builds without errors (pnpm build)
- [ ] #2 Linting and typechecking pass (pnpm lint and pnpm typecheck)
- [ ] #3 All unit and integration tests pass (pnpm test:run:all)
- [ ] #4 API schemas and types are re-generated and verified (pnpm schema:gen and scripts/ci/verify-schema.sh)
- [ ] #5 Documentation artifacts are updated (pnpm docs:artifacts)
- [ ] #6 Automated verification scripts pass (FSM consistency and event log coverage)
<!-- DOD:END -->
