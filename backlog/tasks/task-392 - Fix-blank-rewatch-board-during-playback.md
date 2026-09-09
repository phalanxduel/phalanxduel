---
id: TASK-392
title: Fix blank rewatch board during playback
status: Done
assignee:
  - '@codex'
created_date: '2026-09-09 09:35'
labels:
  - bug
  - rewatch
dependencies: []
modified_files:
  - client/src/game.tsx
  - client/src/game-over.tsx
  - client/src/lobby.tsx
priority: high
type: bug
ordinal: 269800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Rewatch controls advanced and replay APIs returned 200, but the board stayed blank because nested imperative Preact rendering was reconciled away by the parent tree.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Rewatch board renders initial state and remains visible while changing steps.
- [ ] #2 Completed-state frames render game-over view.
- [ ] #3 Client typecheck passes.
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

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Changed rewatch board to render GameApp/GameOverApp declaratively inside the parent Preact tree. Client typecheck passed. Commit 5f2f427.
<!-- SECTION:FINAL_SUMMARY:END -->
